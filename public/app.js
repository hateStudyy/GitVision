/**
 * GitVision - GitHub 仓库历史全景总结工具 - 前端逻辑
 * 纯原生 JavaScript，无任何框架依赖
 */

(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);

  const repoInput = $('#repo-input');
  const analyzeBtn = $('#analyze-btn');
  const statusEl = $('#status');
  const resultEl = $('#result');

  // 回车即触发
  repoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') analyze();
  });
  analyzeBtn.addEventListener('click', analyze);

  /** 设置状态提示 */
  function setStatus(msg, type) {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (type ? ' ' + type : '');
  }

  /** 主入口：触发分析 */
  async function analyze() {
    const repoUrl = repoInput.value.trim();
    if (!repoUrl) {
      setStatus('请输入 GitHub 仓库地址', 'error');
      return;
    }
    setStatus('正在通过 GitHub API 拉取数据，首次查询可能需要 5-15 秒……', 'loading');
    analyzeBtn.disabled = true;
    resultEl.classList.add('hidden');

    try {
      const resp = await fetch(`/api/history?url=${encodeURIComponent(repoUrl)}`);
      const data = await resp.json();
      if (!resp.ok) {
        setStatus('错误：' + (data.error || '请求失败'), 'error');
        return;
      }
      render(data);
      setStatus(`分析完成 · ${data.owner}/${data.repo}`, 'ok');
      resultEl.classList.remove('hidden');
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setStatus('网络异常：' + err.message, 'error');
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  /** 渲染完整结果 */
  function render(d) {
    renderBasic(d);
    renderOverview(d);
    renderQuickLinks(d);
    renderFirstCommit(d);
    renderTimeline(d);
    renderMilestones(d);
    renderCategorized(d);
    renderCommitLists(d);
  }

  /** ① 基础信息 */
  function renderBasic(d) {
    const b = d.basic;
    const items = [
      ['仓库', b.fullName],
      ['描述', b.description || '（无）'],
      ['主语言', b.language || '—'],
      ['Stars', formatNum(b.stars)],
      ['Forks', formatNum(b.forks)],
      ['Watchers', formatNum(b.watchers)],
      ['Open Issues', formatNum(b.openIssues)],
      ['License', b.license || '—'],
      ['默认分支', b.defaultBranch],
      ['创建时间', formatDate(b.createdAt)],
      ['最近更新', formatDate(b.updatedAt)],
      ['最近推送', formatDate(b.pushedAt)],
      ['估算提交数', d.stats.totalCommitsEstimate],
      ['Tag 数量', d.stats.tagCount],
      ['归档状态', b.archived ? '已归档' : '活跃']
    ];
    $('#basic-info').innerHTML = items.map(([k, v]) =>
      `<div class="item"><div class="label">${escape(k)}</div><div class="value">${escape(String(v))}</div></div>`
    ).join('');
  }

  /** ② 项目整体简介：基于基础信息 + 时间线生成自然语言描述 */
  function renderOverview(d) {
    const b = d.basic;
    const created = formatDate(b.createdAt);
    const pushed = formatDate(b.pushedAt);
    const monthly = d.timeline || [];
    const peak = monthly.reduce((a, c) => c.count > (a ? a.count : 0) ? c : a, null);

    const parts = [];
    parts.push(`<p><strong>${escape(b.fullName)}</strong> 是一个${b.language ? ' <strong>' + escape(b.language) + '</strong> ' : '多语言'}项目，`
      + `创建于 <strong>${created}</strong>，最近更新于 <strong>${pushed}</strong>。</p>`);
    if (b.description) {
      parts.push(`<p>项目简介：${escape(b.description)}</p>`);
    }
    parts.push(`<p>当前获得 <strong>${formatNum(b.stars)}</strong> Stars、<strong>${formatNum(b.forks)}</strong> Forks，`
      + `共发布 <strong>${d.stats.tagCount}</strong> 个版本标签。${b.archived ? '仓库已归档，不再活跃维护。' : '仓库仍在活跃维护中。'}</p>`);
    if (peak) {
      parts.push(`<p>开发最活跃的月份是 <strong>${peak.month}</strong>，共有 <strong>${peak.count}</strong> 次提交。</p>`);
    }
    if (b.topics && b.topics.length) {
      parts.push(`<p>主题标签：` + b.topics.map(t => `<span class="tag">${escape(t)}</span>`).join('') + `</p>`);
    }
    $('#overview').innerHTML = parts.join('');
  }

  /** ③ 一键直达跳转链接 */
  function renderQuickLinks(d) {
    const L = d.links;
    const cards = [
      ['⭐ 直达：第一次提交', L.firstCommit, '项目起点 commit，单页永久链接'],
      ['📜 直达：早期提交列表页', L.earlyCommitsPage, '直接跳到最早那一页，无需翻页'],
      ['🕒 最新提交列表', L.commitsLatest, '默认分支最新 commits'],
      ['🏷 Releases 发布页', L.releases, '所有版本发布记录'],
      ['🔖 Tags 标签页', L.tags, '所有版本标签'],
      ['👥 贡献者图表', L.contributors, '按贡献量排序的开发者'],
      ['📈 Pulse 活动摘要', L.pulse, 'GitHub 原生活动周报'],
      ['🔍 搜索提交消息', L.searchCommits, 'GitHub 原生 commit 搜索']
    ].filter(x => x[1]);

    $('#quick-links').innerHTML = cards.map(([title, href, desc]) => `
      <a href="${escape(href)}" target="_blank" rel="noopener">
        <div class="title">${escape(title)}</div>
        <div class="desc">${escape(desc)}</div>
      </a>
    `).join('');

    // 按年份跳转
    const yearHtml = (d.quickJumps || []).map(j =>
      `<a href="${escape(j.url)}" target="_blank" rel="noopener">${escape(j.label)}</a>`
    ).join('');
    $('#year-jumps').innerHTML = yearHtml || '<span style="color:var(--text-dim)">暂无数据</span>';
  }

  /** ④ 首次提交 */
  function renderFirstCommit(d) {
    const f = d.firstCommit;
    if (!f) {
      $('#first-commit').innerHTML = '<p style="color:var(--text-dim)">未能获取到首次提交信息</p>';
      return;
    }
    $('#first-commit').innerHTML = `
      <div><span class="sha">${escape(f.sha)}</span></div>
      <div class="meta">作者：${escape(f.author)} · 时间：${formatDate(f.date)}</div>
      <div class="msg">${escape(f.message)}</div>
      <a class="btn" href="${escape(f.url)}" target="_blank" rel="noopener">→ 在 GitHub 打开首次提交</a>
    `;
  }

  /** ⑤ 时间线 — 年度总览 + 点击展开月份 */
  function renderTimeline(d) {
    const t = d.timeline || [];
    if (!t.length) {
      $('#timeline').innerHTML = '<p style="color:var(--text-dim)">无数据</p>';
      return;
    }

    // 按年聚合
    const yearMap = new Map();
    for (const item of t) {
      const y = item.month.slice(0, 4);
      if (!yearMap.has(y)) yearMap.set(y, []);
      yearMap.get(y).push(item);
    }
    const years = Array.from(yearMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const yearTotals = years.map(([y, months]) => ({
      year: y,
      total: months.reduce((s, m) => s + m.count, 0),
      months
    }));

    const maxYear = Math.max.apply(null, yearTotals.map(y => y.total));
    const totalCommits = yearTotals.reduce((s, y) => s + y.total, 0);
    const monthsWithData = t.filter(x => x.count > 0).length;
    const peakMonth = t.reduce((a, c) => c.count > (a ? a.count : 0) ? c : a, null);
    const barMaxH = 140; // px

    // 统计摘要
    const isExact = d.timelineSource === 'stats_api';
    const sourceLabel = isExact ? '精确统计（GitHub Statistics API）' : '采样统计';
    const statsHtml = `<div class="tl-stats">
      <span>跨度 <strong>${years.length}</strong> 年 · <strong>${t.length}</strong> 个月</span>
      <span>有提交月份 <strong>${monthsWithData}</strong> 个</span>
      <span>总提交数 <strong>${totalCommits}</strong></span>
      ${peakMonth ? '<span>峰值 <strong>' + peakMonth.count + '</strong> 次/月 (' + peakMonth.month + ')</span>' : ''}
      <span>数据来源：<strong>${sourceLabel}</strong></span>
    </div>`;

    // 年度柱状图
    const yearBarsHtml = yearTotals.map(yd => {
      const h = yd.total > 0 ? Math.max(6, Math.round((yd.total / maxYear) * barMaxH)) : 2;
      return `<div class="tl-year-col" data-year="${yd.year}">
        <span class="tl-year-count">${yd.total} 次</span>
        <div class="tl-year-bar" style="height:${h}px"></div>
        <span class="tl-year-label">${yd.year}</span>
      </div>`;
    }).join('');

    // 月份展开面板（初始隐藏）
    const monthPanelHtml = `<div class="tl-month-panel" id="tl-month-panel">
      <div class="tl-month-header">
        <h4 id="tl-month-title">点击上方年份柱查看月份详情</h4>
        <button class="close-btn" id="tl-month-close">收起</button>
      </div>
      <div class="tl-month-grid" id="tl-month-grid"></div>
    </div>`;

    $('#timeline').innerHTML = statsHtml
      + `<div class="tl-years">${yearBarsHtml}</div>`
      + monthPanelHtml;

    // 交互：点击年份展开月份
    const panel = $('#tl-month-panel');
    const grid = $('#tl-month-grid');
    const title = $('#tl-month-title');
    let activeYear = null;

    document.querySelectorAll('.tl-year-col').forEach(col => {
      col.addEventListener('click', function () {
        const y = this.dataset.year;
        if (activeYear === y) { closePanel(); return; }
        activeYear = y;
        document.querySelectorAll('.tl-year-col').forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        const yd = yearTotals.find(x => x.year === y);
        if (!yd) return;
        const maxM = Math.max.apply(null, yd.months.map(m => m.count));
        const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

        // 补全 12 个月
        const full = [];
        for (let mi = 1; mi <= 12; mi++) {
          const key = y + '-' + String(mi).padStart(2, '0');
          const found = yd.months.find(m => m.month === key);
          full.push({ month: key, count: found ? found.count : 0, label: monthNames[mi - 1] });
        }

        grid.innerHTML = full.map(m => {
          const mh = m.count > 0 ? Math.max(6, Math.round((m.count / (maxM || 1)) * 80)) : 2;
          const emptyCls = m.count === 0 ? ' empty' : '';
          return `<div class="tl-month-col">
            <span class="tl-month-num">${m.count}</span>
            <div class="tl-month-bar${emptyCls}" style="height:${mh}px"></div>
            <span class="tl-month-name">${m.label}</span>
          </div>`;
        }).join('');

        title.textContent = y + ' 年 · 共 ' + yd.total + ' 次提交';
        panel.classList.add('open');
      });
    });

    function closePanel() {
      panel.classList.remove('open');
      document.querySelectorAll('.tl-year-col').forEach(c => c.classList.remove('active'));
      activeYear = null;
    }
    $('#tl-month-close').addEventListener('click', closePanel);
  }

  /** ⑥ 里程碑 */
  function renderMilestones(d) {
    const m = d.milestones || [];
    if (!m.length) {
      $('#milestones').innerHTML = '<p style="color:var(--text-dim)">无里程碑</p>';
      return;
    }
    $('#milestones').innerHTML = m.map(item => {
      const badge = item.type === 'first-commit'
        ? '<span class="badge first">起点</span>'
        : '<span class="badge tag">版本</span>';
      const links = item.type === 'tag'
        ? `<a href="${escape(item.url)}" target="_blank" rel="noopener">发布页</a>
           <a href="${escape(item.commitUrl)}" target="_blank" rel="noopener">提交</a>`
        : `<a href="${escape(item.url)}" target="_blank" rel="noopener">打开</a>`;
      return `
        <div class="milestone-item">
          ${badge}
          <span class="title">${escape(item.title)}${item.date ? ' · ' + formatDate(item.date) : ''}</span>
          ${links}
        </div>`;
    }).join('');
  }

  /** ⑦ 分类摘要 */
  function renderCategorized(d) {
    const cats = [
      ['feat', '新增功能 (Feat)'],
      ['fix', '修复 (Fix)'],
      ['refactor', '重构 (Refactor)'],
      ['perf', '性能优化 (Perf)'],
      ['docs', '文档 (Docs)'],
      ['test', '测试 (Test)'],
      ['chore', '杂项 (Chore)']
    ];
    const c = d.categorized || {};
    $('#categorized').innerHTML = cats.map(([k, label]) => {
      const list = c[k] || [];
      const items = list.length
        ? list.map(i => `<li><a href="${escape(i.url)}" target="_blank" rel="noopener">${escape(i.msg)}</a></li>`).join('')
        : '<li style="color:var(--text-dim)">— 无 —</li>';
      return `<div class="cat-box cat-${k}">
        <h4>${escape(label)} <span class="count">(${list.length})</span></h4>
        <ul>${items}</ul>
      </div>`;
    }).join('');
  }

  /** ⑧ 最新 & 最早提交列表 */
  function renderCommitLists(d) {
    const renderList = commits => commits.map(c => `
      <li><a href="${escape(c.url)}" target="_blank" rel="noopener">
        <span class="sha">${escape(c.shortSha)}</span>
        <span class="date">${formatDate(c.date)}</span>
        <div class="msg">${escape(c.message)}</div>
      </a></li>
    `).join('');

    $('#latest-commits').innerHTML = renderList(d.latestCommits || []);
    // 最早的倒序展示（最早在最上方）
    const earliest = (d.earliestCommits || []).slice().reverse();
    $('#earliest-commits').innerHTML = renderList(earliest);
  }

  // ========= 工具 =========
  function escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toISOString().slice(0, 10);
  }
  function formatNum(n) {
    if (n == null) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }
})();
