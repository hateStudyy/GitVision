/**
 * GitVision - GitHub 仓库历史全景总结工具 - 前端逻辑
 * 纯原生 JavaScript，无任何框架依赖
 */

(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const t = window.t;

  const repoInput = $('#repo-input');
  const analyzeBtn = $('#analyze-btn');
  const statusEl = $('#status');
  const resultEl = $('#result');

  // 保存最近一次分析结果，用于语言切换后重渲染
  let lastData = null;

  // 回车即触发
  repoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') analyze();
  });
  analyzeBtn.addEventListener('click', analyze);

  // 监听语言切换：如果有结果就重新渲染
  document.addEventListener('langchange', () => {
    if (lastData) render(lastData);
    // 重新渲染推荐列表
    if (recCache.top) renderRecList('#top-stars', recCache.top);
    if (recCache.trending) renderRecList('#trending', recCache.trending);
    renderRecList('#classics', getClassics(), true);
    backToRecBtn.textContent = t('rec.back');
  });

  /** 轻量 toast 提示 */
  function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-show'));
    setTimeout(() => { el.classList.remove('toast-show'); setTimeout(() => el.remove(), 300); }, 3000);
  }

  /** 设置状态提示 */
  function setStatus(msg, type) {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (type ? ' ' + type : '');
  }

  /** 主入口：触发分析 */
  async function analyze() {
    const repoUrl = repoInput.value.trim();
    if (!repoUrl) {
      setStatus(t('input.empty'), 'error');
      return;
    }
    setStatus(t('status.analyzing'), 'loading');
    analyzeBtn.disabled = true;
    resultEl.classList.add('hidden');

    try {
      const resp = await fetch(`/api/history?url=${encodeURIComponent(repoUrl)}`);
      const data = await resp.json();
      if (!resp.ok) {
        // 限流等带双语 message 的错误
        const lang = window.I18N.getLang();
        let msg;
        if (data.message && typeof data.message === 'object') {
          msg = data.message[lang] || data.message.en || data.error;
        } else {
          msg = data.error || t('status.requestFail');
        }
        setStatus(t('status.error') + msg, 'error');
        return;
      }
      lastData = data;
      render(data);
      const rl = data.rateLimit;
      const quotaText = (rl && rl.remaining != null)
        ? `${t('status.quota')}${rl.remaining}/${rl.limit}`
        : '';
      setStatus(`${t('status.done')}${data.owner}/${data.repo}${quotaText}`, 'ok');
      showResultHideRec();
      resultEl.classList.remove('hidden');
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setStatus(t('status.networkErr') + err.message, 'error');
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
      [t('basic.repo'), b.fullName],
      [t('basic.description'), b.description || t('common.none')],
      [t('basic.language'), b.language || t('common.dash')],
      [t('basic.stars'), formatNum(b.stars)],
      [t('basic.forks'), formatNum(b.forks)],
      [t('basic.watchers'), formatNum(b.watchers)],
      [t('basic.openIssues'), formatNum(b.openIssues)],
      [t('basic.license'), b.license || t('common.dash')],
      [t('basic.defaultBranch'), b.defaultBranch],
      [t('basic.createdAt'), formatDate(b.createdAt)],
      [t('basic.updatedAt'), formatDate(b.updatedAt)],
      [t('basic.pushedAt'), formatDate(b.pushedAt)],
      [t('basic.totalCommits'), d.stats.totalCommitsEstimate],
      [t('basic.tagCount'), d.stats.tagCount],
      [t('basic.archived'), b.archived ? t('basic.archived.yes') : t('basic.archived.no')]
    ];
    $('#basic-info').innerHTML = items.map(([k, v]) =>
      `<div class="item"><div class="label">${escape(k)}</div><div class="value">${escape(String(v))}</div></div>`
    ).join('');
  }

  /** ② 项目整体简介 */
  function renderOverview(d) {
    const b = d.basic;
    const created = formatDate(b.createdAt);
    const pushed = formatDate(b.pushedAt);
    const monthly = d.timeline || [];
    const peak = monthly.reduce((a, c) => c.count > (a ? a.count : 0) ? c : a, null);

    const langLabel = b.language ? ' <strong>' + escape(b.language) + '</strong> ' : ' ' + t('overview.multilang') + ' ';

    const parts = [];
    parts.push(`<p><strong>${escape(b.fullName)}</strong> ${t('overview.is')}${langLabel}${t('overview.project')}`
      + `${t('overview.createdOn')}<strong>${created}</strong>${t('overview.lastUpdate')}<strong>${pushed}</strong>.</p>`);
    if (b.description) {
      parts.push(`<p>${t('overview.intro')}${escape(b.description)}</p>`);
    }
    parts.push(`<p>${t('overview.has')}<strong>${formatNum(b.stars)}</strong> ${t('overview.starsLabel')}`
      + `<strong>${formatNum(b.forks)}</strong> ${t('overview.forksLabel')}`
      + `<strong>${d.stats.tagCount}</strong> ${t('overview.tagsLabel')}`
      + `${b.archived ? t('overview.archived') : t('overview.active')}</p>`);
    if (peak) {
      parts.push(`<p>${t('overview.peak')}<strong>${peak.month}</strong>${t('overview.peakSuffix')}<strong>${peak.count}</strong> ${t('overview.peakCommits')}</p>`);
    }
    if (b.topics && b.topics.length) {
      parts.push(`<p>${t('overview.topics')}` + b.topics.map(tp => `<span class="tag">${escape(tp)}</span>`).join('') + `</p>`);
    }
    $('#overview').innerHTML = parts.join('');
  }

  /** ③ 一键直达跳转链接 */
  function renderQuickLinks(d) {
    const L = d.links;
    const cards = [
      [t('qlink.firstCommit.title'), L.firstCommit, t('qlink.firstCommit.desc')],
      [t('qlink.earlyCommitsPage.title'), L.earlyCommitsPage, t('qlink.earlyCommitsPage.desc')],
      [t('qlink.commitsLatest.title'), L.commitsLatest, t('qlink.commitsLatest.desc')],
      [t('qlink.releases.title'), L.releases, t('qlink.releases.desc')],
      [t('qlink.tags.title'), L.tags, t('qlink.tags.desc')],
      [t('qlink.contributors.title'), L.contributors, t('qlink.contributors.desc')],
      [t('qlink.pulse.title'), L.pulse, t('qlink.pulse.desc')],
      [t('qlink.searchCommits.title'), L.searchCommits, t('qlink.searchCommits.desc')]
    ].filter(x => x[1]);

    $('#quick-links').innerHTML = cards.map(([title, href, desc]) => `
      <a href="${escape(href)}" target="_blank" rel="noopener">
        <div class="title">${escape(title)}</div>
        <div class="desc">${escape(desc)}</div>
      </a>
    `).join('');

    const yearHtml = (d.quickJumps || []).map(j => {
      const label = t('qjump.yearLabel').replace('{year}', j.year);
      return `<a href="${escape(j.url)}" target="_blank" rel="noopener">${escape(label)}</a>`;
    }).join('');
    $('#year-jumps').innerHTML = yearHtml || `<span style="color:var(--text-dim)">${t('qlink.empty')}</span>`;
  }

  /** ④ 首次提交 */
  function renderFirstCommit(d) {
    const f = d.firstCommit;
    if (!f) {
      $('#first-commit').innerHTML = `<p style="color:var(--text-dim)">${t('fc.notFound')}</p>`;
      return;
    }
    $('#first-commit').innerHTML = `
      <div><span class="sha">${escape(f.sha)}</span></div>
      <div class="meta">${t('fc.author')}${escape(f.author)}${t('fc.date')}${formatDate(f.date)}</div>
      <div class="msg">${escape(f.message)}</div>
      <a class="btn" href="${escape(f.url)}" target="_blank" rel="noopener">${t('fc.openOnGithub')}</a>
    `;
  }

  /** ⑤ 时间线 */
  function renderTimeline(d) {
    const tl = d.timeline || [];
    if (!tl.length) {
      $('#timeline').innerHTML = `<p style="color:var(--text-dim)">${t('common.noData')}</p>`;
      return;
    }

    const yearMap = new Map();
    for (const item of tl) {
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
    const monthsWithData = tl.filter(x => x.count > 0).length;
    const peakMonth = tl.reduce((a, c) => c.count > (a ? a.count : 0) ? c : a, null);
    const barMaxH = 140;

    const isExact = d.timelineSource === 'stats_api';
    const sourceBadge = isExact
      ? `<span class="tl-badge tl-badge-ok">${t('tl.badge.exact')}</span><span class="tl-tip" data-tip="${escape(t('tl.exact.tip'))}">?</span>`
      : `<span class="tl-badge tl-badge-warn">${t('tl.badge.sample')}</span><span class="tl-tip" data-tip="${escape(t('tl.sample.tip'))}">?</span><button class="tl-refresh-btn" id="tl-refresh">${t('tl.refresh')}</button>`;
    const statsHtml = `<div class="tl-stats">
      <div class="tl-stats-row">
        <span>${t('tl.span')}<strong>${years.length}</strong>${t('tl.year')}<strong>${tl.length}</strong>${t('tl.months')}</span>
        <span>${t('tl.activeMonths')}<strong>${monthsWithData}</strong>${t('tl.activeMonthsUnit')}</span>
        <span>${t('tl.totalCommits')}<strong>${totalCommits}</strong>${isExact ? '' : t('tl.estimated')}</span>
        ${peakMonth ? '<span>' + t('tl.peak') + '<strong>' + peakMonth.count + '</strong>' + t('tl.peakUnit') + ' (' + peakMonth.month + ')</span>' : ''}
      </div>
      <div class="tl-source">${t('tl.source')}${sourceBadge}</div>
    </div>`;

    const yearBarsHtml = yearTotals.map(yd => {
      const h = yd.total > 0 ? Math.max(6, Math.round((yd.total / maxYear) * barMaxH)) : 2;
      return `<div class="tl-year-col" data-year="${yd.year}">
        <span class="tl-year-count">${yd.total}${t('tl.times') ? ' ' + t('tl.times') : ''}</span>
        <div class="tl-year-bar" style="height:${h}px"></div>
        <span class="tl-year-label">${yd.year}</span>
      </div>`;
    }).join('');

    const monthPanelHtml = `<div class="tl-month-panel" id="tl-month-panel">
      <div class="tl-month-header">
        <h4 id="tl-month-title">${t('tl.clickHint')}</h4>
        <button class="close-btn" id="tl-month-close">${t('tl.collapse')}</button>
      </div>
      <div class="tl-month-grid" id="tl-month-grid"></div>
    </div>`;

    $('#timeline').innerHTML = statsHtml
      + `<div class="tl-years">${yearBarsHtml}</div>`
      + monthPanelHtml;

    const panel = $('#tl-month-panel');
    const grid = $('#tl-month-grid');
    const title = $('#tl-month-title');
    let activeYear = null;
    const monthNames = t('tl.monthNames');

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

        title.textContent = y + t('tl.yearTotal') + yd.total + t('tl.yearTotalSuffix');
        panel.classList.add('open');
      });
    });

    function closePanel() {
      panel.classList.remove('open');
      document.querySelectorAll('.tl-year-col').forEach(c => c.classList.remove('active'));
      activeYear = null;
    }
    $('#tl-month-close').addEventListener('click', closePanel);

    const refreshBtn = document.getElementById('tl-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        refreshBtn.disabled = true;
        const maxWait = 180000;
        const interval = 5000;
        const start = Date.now();
        let ticker;

        ticker = setInterval(() => {
          const s = Math.round((Date.now() - start) / 1000);
          if (s <= 10) {
            refreshBtn.textContent = t('tl.refresh.computing') + s + 's';
          } else {
            refreshBtn.textContent = t('tl.refresh.background') + s + t('tl.refresh.bgSuffix');
          }
        }, 500);

        async function poll() {
          try {
            const resp = await fetch(`/api/refresh-stats?url=${encodeURIComponent(d.owner + '/' + d.repo)}`);
            const result = await resp.json();
            if (result.status === 'ok' && result.timeline) {
              clearInterval(ticker);
              d.timeline = result.timeline;
              d.timelineSource = result.timelineSource;
              renderTimeline(d);
              showToast(t('tl.refresh.success'));
              return;
            }
            if (result.status === 'computing' && Date.now() - start < maxWait) {
              setTimeout(poll, interval);
              return;
            }
            clearInterval(ticker);
            refreshBtn.textContent = t('tl.refresh.notReady');
            refreshBtn.disabled = false;
          } catch (e) {
            clearInterval(ticker);
            refreshBtn.textContent = t('tl.refresh.failed');
            refreshBtn.disabled = false;
          }
        }
        poll();
      });
    }
  }

  /** ⑥ 里程碑 */
  function renderMilestones(d) {
    const m = d.milestones || [];
    if (!m.length) {
      $('#milestones').innerHTML = `<p style="color:var(--text-dim)">${t('ms.empty')}</p>`;
      return;
    }
    $('#milestones').innerHTML = m.map(item => {
      const badge = item.type === 'first-commit'
        ? `<span class="badge first">${t('ms.start')}</span>`
        : `<span class="badge tag">${t('ms.version')}</span>`;
      const title = item.type === 'first-commit'
        ? t('ms.firstCommitTitle')
        : t('ms.tagTitle').replace('{tag}', item.tag || '');
      const links = item.type === 'tag'
        ? `<a href="${escape(item.url)}" target="_blank" rel="noopener">${t('ms.releasePage')}</a>
           <a href="${escape(item.commitUrl)}" target="_blank" rel="noopener">${t('ms.commit')}</a>`
        : `<a href="${escape(item.url)}" target="_blank" rel="noopener">${t('ms.open')}</a>`;
      return `
        <div class="milestone-item">
          ${badge}
          <span class="title">${escape(title)}${item.date ? ' · ' + formatDate(item.date) : ''}</span>
          ${links}
        </div>`;
    }).join('');
  }

  /** ⑦ 分类摘要 */
  function renderCategorized(d) {
    const cats = [
      ['feat', t('cat.feat')],
      ['fix', t('cat.fix')],
      ['refactor', t('cat.refactor')],
      ['perf', t('cat.perf')],
      ['docs', t('cat.docs')],
      ['test', t('cat.test')],
      ['chore', t('cat.chore')]
    ];
    const c = d.categorized || {};
    $('#categorized').innerHTML = cats.map(([k, label]) => {
      const list = c[k] || [];
      const items = list.length
        ? list.map(i => `<li><a href="${escape(i.url)}" target="_blank" rel="noopener">${escape(i.msg)}</a></li>`).join('')
        : `<li style="color:var(--text-dim)">${t('cat.empty')}</li>`;
      return `<div class="cat-box cat-${k}">
        <h4>${escape(label)} <span class="count">(${list.length})</span></h4>
        <ul>${items}</ul>
      </div>`;
    }).join('');
  }

  /** ⑧ 最新 & 最早提交 */
  function renderCommitLists(d) {
    const renderList = commits => commits.map(c => `
      <li><a href="${escape(c.url)}" target="_blank" rel="noopener">
        <span class="sha">${escape(c.shortSha)}</span>
        <span class="date">${formatDate(c.date)}</span>
        <div class="msg">${escape(c.message)}</div>
      </a></li>
    `).join('');

    $('#latest-commits').innerHTML = renderList(d.latestCommits || []);
    const earliest = (d.earliestCommits || []).slice().reverse();
    $('#earliest-commits').innerHTML = renderList(earliest);
  }

  // ========= 推荐仓库 =========
  const recSection = $('#recommendations');
  const recCache = { top: null, trending: null };
  const backToRecBtn = document.createElement('button');
  backToRecBtn.id = 'back-to-rec';
  backToRecBtn.className = 'back-to-rec hidden';
  backToRecBtn.textContent = t('rec.back');
  document.querySelector('.input-card').after(backToRecBtn);

  backToRecBtn.addEventListener('click', function () {
    resultEl.classList.add('hidden');
    recSection.classList.remove('hidden');
    backToRecBtn.classList.add('hidden');
    setStatus('');
  });

  // 知名开源项目（描述按当前语言渲染）
  const CLASSICS_DATA = [
    { fullName: 'torvalds/linux',          desc: { zh: 'Linux 内核源码，现代操作系统的基石', en: 'The Linux kernel — foundation of modern operating systems' }, language: 'C' },
    { fullName: 'facebook/react',          desc: { zh: '构建用户界面的 JavaScript 库', en: 'A JavaScript library for building user interfaces' }, language: 'JavaScript' },
    { fullName: 'tensorflow/tensorflow',   desc: { zh: 'Google 开源机器学习框架', en: 'Google\'s open-source machine learning framework' }, language: 'C++' },
    { fullName: 'microsoft/vscode',        desc: { zh: '最流行的代码编辑器', en: 'The most popular code editor' }, language: 'TypeScript' },
    { fullName: 'golang/go',               desc: { zh: 'Go 编程语言', en: 'The Go programming language' }, language: 'Go' },
    { fullName: 'rust-lang/rust',          desc: { zh: 'Rust 编程语言', en: 'The Rust programming language' }, language: 'Rust' },
    { fullName: 'nodejs/node',             desc: { zh: 'Node.js JavaScript 运行时', en: 'The Node.js JavaScript runtime' }, language: 'JavaScript' },
    { fullName: 'vuejs/vue',               desc: { zh: '渐进式 JavaScript 框架', en: 'The progressive JavaScript framework' }, language: 'TypeScript' },
    { fullName: 'django/django',           desc: { zh: 'Python Web 框架', en: 'The Python Web framework' }, language: 'Python' },
    { fullName: 'kubernetes/kubernetes',   desc: { zh: '容器编排系统', en: 'Container orchestration system' }, language: 'Go' }
  ];
  // 按当前语言生成经典列表
  function getClassics() {
    const lang = window.I18N.getLang();
    return CLASSICS_DATA.map(x => ({
      fullName: x.fullName,
      description: x.desc[lang] || x.desc.en,
      language: x.language,
      stars: 0
    }));
  }

  function loadRecommendations() {
    fetch('/api/top-stars').then(r => r.json()).then(items => {
      recCache.top = items;
      renderRecList('#top-stars', items);
    }).catch(() => {
      document.querySelector('#top-stars').innerHTML = `<span class="rec-loading">${t('rec.loadFailed')}</span>`;
    });
    fetch('/api/trending').then(r => r.json()).then(items => {
      recCache.trending = items;
      renderRecList('#trending', items);
    }).catch(() => {
      document.querySelector('#trending').innerHTML = `<span class="rec-loading">${t('rec.loadFailed')}</span>`;
    });
    renderRecList('#classics', getClassics(), true);
  }

  function renderRecList(sel, items, hideStars) {
    const arr = Array.isArray(items) ? items : Array.from(items || []);
    if (!arr.length) {
      document.querySelector(sel).innerHTML = `<span class="rec-loading">${t('rec.empty')}</span>`;
      return;
    }
    document.querySelector(sel).innerHTML = arr.map((r, i) => {
      const stars = r.stars >= 1000 ? (r.stars / 1000).toFixed(1) + 'k' : (r.stars > 0 ? r.stars : '');
      const starsText = (!hideStars && stars) ? ' · ' + stars + ' stars' : '';
      const rankBadge = `<span class="rec-rank">${i + 1}</span>`;
      return `<div class="rec-item" data-repo="${escape(r.fullName)}">
        ${rankBadge}
        <div class="rec-info">
          <span class="rec-name">${escape(r.fullName)}</span>
          <span class="rec-meta">${escape(r.language || '')}${starsText}</span>
          <span class="rec-desc">${escape((r.description || '').slice(0, 80))}</span>
        </div>
        <div class="rec-actions">
          <button class="rec-analyze" data-repo="${escape(r.fullName)}">${t('rec.analyze')}</button>
          <a class="rec-goto" href="https://github.com/${escape(r.fullName)}" target="_blank" rel="noopener">${t('rec.goto')}</a>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll(sel + ' .rec-analyze').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        repoInput.value = this.dataset.repo;
        analyze();
      });
    });
  }

  function showResultHideRec() {
    recSection.classList.add('hidden');
    backToRecBtn.classList.remove('hidden');
  }

  document.querySelectorAll('.rec-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.rec-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.rec-panel').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('panel-' + this.dataset.tab).classList.add('active');
    });
  });

  loadRecommendations();

  // ========= 工具 =========
  function escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatDate(s) {
    if (!s) return t('common.dash');
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
