/**
 * GitVision - GitHub 仓库历史全景总结工具 - 后端服务器
 *
 * 技术约束：纯原生 Node.js，不使用任何第三方框架
 * 仅依赖 Node.js 内置模块：http, https, fs, path, url
 *
 * 职责：
 *   1. 静态文件服务（前端 HTML / CSS / JS）
 *   2. 代理 GitHub REST API 请求，附加可选的 Token（提升限流额度）
 *   3. 聚合仓库信息、提交历史、标签、首次提交等数据
 *   4. 生成符合 GitHub 原生 URL 规则的跳转链接
 *   5. 对提交历史做本地结构化摘要（无需外部 AI，基于规则分类）
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ========= 基础配置 =========
const PORT = process.env.PORT || 3000;
// 可选：设置 GitHub Personal Access Token 以提升 API 限流额度
// 未登录：60 次/小时；带 Token：5000 次/小时
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API_HOST = 'api.github.com';
const USER_AGENT = 'GitVision/1.0';

// 静态资源 MIME 映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

// ========= 工具函数 =========

/**
 * 发起一次 GitHub API 请求（GET）
 * 返回 { status, headers, body, linkHeader }
 */
function githubRequest(pathname, query = {}) {
  return new Promise((resolve, reject) => {
    const qs = Object.keys(query)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');
    const fullPath = qs ? `${pathname}?${qs}` : pathname;

    const headers = {
      'User-Agent': USER_AGENT,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const req = https.request(
      {
        host: GITHUB_API_HOST,
        path: fullPath,
        method: 'GET',
        headers
      },
      res => {
        let chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          let parsed = null;
          try { parsed = JSON.parse(body); } catch (_) { parsed = body; }
          // 追踪 API 配额
          if (res.headers['x-ratelimit-remaining'] != null) {
            lastRateLimit = {
              remaining: parseInt(res.headers['x-ratelimit-remaining'], 10),
              limit: parseInt(res.headers['x-ratelimit-limit'], 10),
              reset: parseInt(res.headers['x-ratelimit-reset'], 10)
            };
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            linkHeader: res.headers['link'] || ''
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('GitHub API 请求超时'));
    });
    req.end();
  });
}

/**
 * 解析 GitHub Link 头，提取 last 页码，用于定位最后一页
 * 示例: <https://api.github.com/...&page=2>; rel="next", <...&page=50>; rel="last"
 */
function parseLastPageFromLink(linkHeader) {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const p of parts) {
    const m = p.match(/<([^>]+)>;\s*rel="last"/);
    if (m) {
      const u = new URL(m[1]);
      const page = u.searchParams.get('page');
      return page ? parseInt(page, 10) : null;
    }
  }
  return null;
}

/**
 * 从任意 GitHub 仓库 URL 中解析 owner/repo
 * 支持：
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   git@github.com:owner/repo.git
 *   owner/repo
 */
function parseRepoUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  // git@github.com:owner/repo.git
  let m = s.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (m) return { owner: m[1], repo: m[2] };

  // owner/repo 短格式
  m = s.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (m && !s.startsWith('http')) return { owner: m[1], repo: m[2].replace(/\.git$/, '') };

  // 完整 URL
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (!/github\.com$/i.test(u.hostname)) return null;
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length < 2) return null;
    return {
      owner: segs[0],
      repo: segs[1].replace(/\.git$/, '')
    };
  } catch (_) {
    return null;
  }
}

// ========= 业务逻辑 =========

/**
 * 聚合获取仓库全景数据
 * 步骤：
 *   1. 获取仓库基础信息
 *   2. 获取默认分支 commits 第一页以拿到 Link 头，推算总页数 => 获取最后一页 => 拿到首次提交
 *   3. 获取 tags（分页抓取，最多 N 页）
 *   4. 采样 commits（头部最新 + 尾部最早 + 中间关键节点），避免抓光全部
 *   5. 生成摘要与跳转链接
 */
async function aggregateRepoHistory(owner, repo) {
  // 1. 仓库基础信息
  const repoResp = await githubRequest(`/repos/${owner}/${repo}`);
  if (repoResp.status === 404) {
    const err = new Error('仓库不存在或为私有仓库（无权限访问）');
    err.statusCode = 404;
    throw err;
  }
  if (repoResp.status === 403) {
    const err = new Error('GitHub API 限流，请稍后再试或配置 GITHUB_TOKEN 环境变量');
    err.statusCode = 403;
    throw err;
  }
  if (repoResp.status !== 200) {
    const err = new Error(`获取仓库信息失败: HTTP ${repoResp.status}`);
    err.statusCode = repoResp.status;
    throw err;
  }

  const repoInfo = repoResp.body;
  const defaultBranch = repoInfo.default_branch || 'main';

  // 2. 首页 commits（per_page=100 以减少请求次数）
  const firstPage = await githubRequest(`/repos/${owner}/${repo}/commits`, {
    sha: defaultBranch,
    per_page: 100,
    page: 1
  });
  if (firstPage.status !== 200) {
    const err = new Error(`获取提交历史失败: HTTP ${firstPage.status}`);
    err.statusCode = firstPage.status;
    throw err;
  }

  const latestCommits = Array.isArray(firstPage.body) ? firstPage.body : [];
  const lastPage = parseLastPageFromLink(firstPage.linkHeader);
  const totalCommitsEstimate = lastPage
    ? (lastPage - 1) * 100 + 0 /* 最后一页数量未知 */
    : latestCommits.length;

  // 3. 获取最后一页（最早的提交们）
  let earliestCommits = [];
  let firstCommit = null;
  if (lastPage && lastPage > 1) {
    const lastResp = await githubRequest(`/repos/${owner}/${repo}/commits`, {
      sha: defaultBranch,
      per_page: 100,
      page: lastPage
    });
    if (lastResp.status === 200 && Array.isArray(lastResp.body)) {
      earliestCommits = lastResp.body;
      firstCommit = earliestCommits[earliestCommits.length - 1] || null;
    }
  } else {
    // 仅一页，最早的提交就是本页最后一个
    firstCommit = latestCommits[latestCommits.length - 1] || null;
    earliestCommits = latestCommits.slice(-10);
  }

  // 4. 标签（取前 2 页，通常足够）
  const tagsResp = await githubRequest(`/repos/${owner}/${repo}/tags`, { per_page: 100, page: 1 });
  let tags = Array.isArray(tagsResp.body) ? tagsResp.body : [];
  if (tags.length === 100) {
    const tagsResp2 = await githubRequest(`/repos/${owner}/${repo}/tags`, { per_page: 100, page: 2 });
    if (Array.isArray(tagsResp2.body)) tags = tags.concat(tagsResp2.body);
  }

  // 5. 均匀采样多页（最多 4 个中间页），用于分类摘要
  //    并发请求加速（有 Token 时不怕限流）
  let midCommits = [];
  if (lastPage && lastPage > 2) {
    const maxSamplePages = Math.min(4, lastPage - 2);
    const step = (lastPage - 2) / (maxSamplePages + 1);
    const pagesToFetch = [];
    for (let i = 1; i <= maxSamplePages; i++) {
      pagesToFetch.push(Math.round(1 + step * i));
    }
    const results = await Promise.all(
      pagesToFetch.map(p =>
        githubRequest(`/repos/${owner}/${repo}/commits`, {
          sha: defaultBranch, per_page: 100, page: p
        })
      )
    );
    for (const r of results) {
      if (r.status === 200 && Array.isArray(r.body)) {
        midCommits = midCommits.concat(r.body);
      }
    }
  }

  // 6. 获取完整时间线：使用 GitHub Statistics API（完全不阻塞）
  //    仅发一次请求：200 直接用；202 说明 GitHub 在后台计算，
  //    不等待，直接用采样数据，用户可点"刷新"再次请求
  let weeklyData = null;
  const statsResp = await githubRequest(`/repos/${owner}/${repo}/stats/contributors`);
  if (statsResp.status === 200 && Array.isArray(statsResp.body)) {
    weeklyData = statsResp.body;
  }

  // 将所有贡献者的周数据叠加为 { weekTimestamp -> totalCommits }
  const weeklyMap = new Map();
  if (weeklyData) {
    for (const contributor of weeklyData) {
      if (!contributor.weeks) continue;
      for (const w of contributor.weeks) {
        weeklyMap.set(w.w, (weeklyMap.get(w.w) || 0) + w.c);
      }
    }
  }

  return {
    repoInfo,
    defaultBranch,
    latestCommits,
    earliestCommits,
    midCommits,
    firstCommit,
    tags,
    lastPage,
    totalCommitsEstimate,
    weeklyMap
  };
}

/**
 * 规则驱动的提交摘要：
 * 按关键词将 commit message 分类到：feat / fix / refactor / perf / docs / test / chore / other
 * 并抽取迭代阶段（按月份聚合）
 */
function summarizeCommits(allCommits) {
  const buckets = {
    feat: [], fix: [], refactor: [], perf: [], docs: [], test: [], chore: [], other: []
  };
  const monthly = new Map(); // YYYY-MM -> count

  const classify = msg => {
    const m = (msg || '').toLowerCase();
    if (/^feat|add |新增|feature|implement/.test(m)) return 'feat';
    if (/^fix|bug|修复|patch|hotfix/.test(m)) return 'fix';
    if (/^refactor|重构|cleanup|restructure/.test(m)) return 'refactor';
    if (/^perf|性能|optimize|优化|speed/.test(m)) return 'perf';
    if (/^docs|文档|readme|comment/.test(m)) return 'docs';
    if (/^test|测试|spec/.test(m)) return 'test';
    if (/^chore|build|ci|release|bump|deps|依赖/.test(m)) return 'chore';
    return 'other';
  };

  for (const c of allCommits) {
    const msg = (c.commit && c.commit.message) ? c.commit.message.split('\n')[0] : '';
    const date = c.commit && c.commit.author && c.commit.author.date;
    const cat = classify(msg);
    buckets[cat].push({ sha: c.sha, msg, date });

    if (date) {
      const ym = date.slice(0, 7);
      monthly.set(ym, (monthly.get(ym) || 0) + 1);
    }
  }

  // 补全从最早月份到最新月份之间所有空缺的月份（count=0）
  const sortedMonths = Array.from(monthly.keys()).sort();
  let timeline = [];
  if (sortedMonths.length >= 2) {
    const [startY, startM] = sortedMonths[0].split('-').map(Number);
    const [endY, endM] = sortedMonths[sortedMonths.length - 1].split('-').map(Number);
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      timeline.push({ month: key, count: monthly.get(key) || 0 });
      m++;
      if (m > 12) { m = 1; y++; }
    }
  } else {
    timeline = Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, count]) => ({ month: ym, count }));
  }

  return { buckets, timeline };
}

/**
 * 生成 GitHub 原生跳转链接
 * 所有链接严格使用 github.com 公开 URL 规则，可直接在浏览器打开
 */
function buildGithubLinks(owner, repo, branch, firstCommitSha, lastPage) {
  const base = `https://github.com/${owner}/${repo}`;
  const commitsBase = `${base}/commits/${encodeURIComponent(branch)}`;

  const links = {
    repo: base,
    defaultBranch: `${base}/tree/${encodeURIComponent(branch)}`,
    // 最新提交列表
    commitsLatest: commitsBase,
    // 首次提交单页（如有）
    firstCommit: firstCommitSha ? `${base}/commit/${firstCommitSha}` : null,
    // 首次提交在 commits 列表里的上下文页（GitHub 原生支持 ?after=SHA+N 的分页锚点）
    firstCommitContext: firstCommitSha
      ? `${commitsBase}?after=${firstCommitSha}+0`
      : null,
    // 早期提交列表（倒数第二页，呈现最早的一批提交）
    earlyCommitsPage: lastPage && lastPage > 1
      ? `${commitsBase}?page=${lastPage}`
      : commitsBase,
    // 按年份筛选（需要配合前端传入）——此处提供通用模板
    byDateTemplate: `${commitsBase}?until=YYYY-MM-DD&since=YYYY-MM-DD`,
    // 发布页 / 标签
    releases: `${base}/releases`,
    tags: `${base}/tags`,
    // 贡献者 & 活动
    contributors: `${base}/graphs/contributors`,
    pulse: `${base}/pulse`,
    // 搜索提交消息
    searchCommits: `${base}/search?type=commits`
  };

  return links;
}

/**
 * 为 commit 生成单页跳转链接
 */
function commitUrl(owner, repo, sha) {
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}

/**
 * 为日期范围生成 commits 筛选 URL（GitHub 原生支持 since/until）
 */
function dateRangeCommitsUrl(owner, repo, branch, sinceISO, untilISO) {
  const b = encodeURIComponent(branch);
  const params = [];
  if (sinceISO) params.push(`since=${sinceISO}`);
  if (untilISO) params.push(`until=${untilISO}`);
  return `https://github.com/${owner}/${repo}/commits/${b}?${params.join('&')}`;
}

// ========= 分析结果缓存 =========
const historyCache = new Map();
const HISTORY_CACHE_TTL = 10 * 60 * 1000; // 10 分钟

// ========= API 配额追踪 =========
let lastRateLimit = { remaining: null, limit: null, reset: null };

// ========= HTTP 路由 =========

/**
 * API: /api/history?url=<github repo url>
 */
async function handleHistoryApi(req, res, parsedUrl) {
  const input = parsedUrl.query.url || parsedUrl.query.repo;
  if (!input) {
    return sendJson(res, 400, { error: '缺少 url 参数' });
  }
  const parsed = parseRepoUrl(input);
  if (!parsed) {
    return sendJson(res, 400, { error: '无法解析仓库地址，请确认是合法的 GitHub 仓库 URL' });
  }

  // 缓存命中：10 分钟内同一仓库直接返回
  const cacheKey = `${parsed.owner}/${parsed.repo}`.toLowerCase();
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.at < HISTORY_CACHE_TTL) {
    return sendJson(res, 200, cached.data);
  }

  try {
    const data = await aggregateRepoHistory(parsed.owner, parsed.repo);
    const { repoInfo, defaultBranch, latestCommits, earliestCommits, midCommits,
            firstCommit, tags, lastPage, totalCommitsEstimate, weeklyMap } = data;

    // 合并用于摘要的 commit 样本
    const sample = [...latestCommits, ...midCommits, ...earliestCommits];
    const dedup = new Map();
    for (const c of sample) if (c && c.sha) dedup.set(c.sha, c);
    const sampleCommits = Array.from(dedup.values());

    const summary = summarizeCommits(sampleCommits);

    // 用 GitHub Statistics API 的精确周数据构建完整月度时间线
    // 如果 weeklyMap 有数据则替换采样时间线
    if (weeklyMap && weeklyMap.size > 0) {
      const monthlyExact = new Map();
      for (const [ts, count] of weeklyMap) {
        if (count === 0) continue;
        const d = new Date(ts * 1000);
        const ym = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
        monthlyExact.set(ym, (monthlyExact.get(ym) || 0) + count);
      }
      // 补全空缺月份
      const sortedKeys = Array.from(monthlyExact.keys()).sort();
      if (sortedKeys.length >= 2) {
        const [sY, sM] = sortedKeys[0].split('-').map(Number);
        const [eY, eM] = sortedKeys[sortedKeys.length - 1].split('-').map(Number);
        const fullTimeline = [];
        let y = sY, m = sM;
        while (y < eY || (y === eY && m <= eM)) {
          const key = `${y}-${String(m).padStart(2, '0')}`;
          fullTimeline.push({ month: key, count: monthlyExact.get(key) || 0 });
          m++;
          if (m > 12) { m = 1; y++; }
        }
        summary.timeline = fullTimeline;
        summary.timelineSource = 'stats_api';
      }
    }
    const links = buildGithubLinks(
      parsed.owner, parsed.repo, defaultBranch,
      firstCommit ? firstCommit.sha : null,
      lastPage
    );

    // 关键里程碑：包含首次提交、每个 tag 对应的提交、以及每类最具代表性的前 3 条
    const milestones = [];
    if (firstCommit) {
      milestones.push({
        type: 'first-commit',
        title: '首次提交（项目起点）',
        sha: firstCommit.sha,
        date: firstCommit.commit.author.date,
        message: firstCommit.commit.message.split('\n')[0],
        url: commitUrl(parsed.owner, parsed.repo, firstCommit.sha)
      });
    }
    for (const t of tags.slice(0, 50)) {
      milestones.push({
        type: 'tag',
        title: `版本标签 ${t.name}`,
        sha: t.commit.sha,
        tag: t.name,
        url: `https://github.com/${parsed.owner}/${parsed.repo}/releases/tag/${encodeURIComponent(t.name)}`,
        commitUrl: commitUrl(parsed.owner, parsed.repo, t.commit.sha)
      });
    }

    // 构造响应
    const payload = {
      owner: parsed.owner,
      repo: parsed.repo,
      basic: {
        fullName: repoInfo.full_name,
        description: repoInfo.description,
        homepage: repoInfo.homepage,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        watchers: repoInfo.subscribers_count,
        openIssues: repoInfo.open_issues_count,
        license: repoInfo.license ? repoInfo.license.spdx_id : null,
        defaultBranch,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at,
        pushedAt: repoInfo.pushed_at,
        topics: repoInfo.topics || [],
        archived: repoInfo.archived,
        htmlUrl: repoInfo.html_url
      },
      stats: {
        totalCommitsEstimate: lastPage ? `≥ ${(lastPage - 1) * 100}` : String(latestCommits.length),
        lastPage: lastPage || 1,
        tagCount: tags.length,
        sampleSize: sampleCommits.length
      },
      firstCommit: firstCommit ? {
        sha: firstCommit.sha,
        date: firstCommit.commit.author.date,
        author: firstCommit.commit.author.name,
        message: firstCommit.commit.message,
        url: commitUrl(parsed.owner, parsed.repo, firstCommit.sha)
      } : null,
      latestCommits: latestCommits.slice(0, 20).map(c => ({
        sha: c.sha,
        shortSha: c.sha.slice(0, 7),
        date: c.commit.author.date,
        author: c.commit.author.name,
        message: c.commit.message.split('\n')[0],
        url: commitUrl(parsed.owner, parsed.repo, c.sha)
      })),
      earliestCommits: earliestCommits.slice(-20).map(c => ({
        sha: c.sha,
        shortSha: c.sha.slice(0, 7),
        date: c.commit.author.date,
        author: c.commit.author.name,
        message: c.commit.message.split('\n')[0],
        url: commitUrl(parsed.owner, parsed.repo, c.sha)
      })),
      tags: tags.slice(0, 100).map(t => ({
        name: t.name,
        sha: t.commit.sha,
        url: `https://github.com/${parsed.owner}/${parsed.repo}/releases/tag/${encodeURIComponent(t.name)}`
      })),
      milestones,
      timeline: summary.timeline,
      timelineSource: summary.timelineSource || 'sampled',
      categorized: {
        feat: summary.buckets.feat.slice(0, 15).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) })),
        fix: summary.buckets.fix.slice(0, 15).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) })),
        refactor: summary.buckets.refactor.slice(0, 10).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) })),
        perf: summary.buckets.perf.slice(0, 10).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) })),
        docs: summary.buckets.docs.slice(0, 10).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) })),
        test: summary.buckets.test.slice(0, 10).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) })),
        chore: summary.buckets.chore.slice(0, 10).map(x => ({ ...x, url: commitUrl(parsed.owner, parsed.repo, x.sha) }))
      },
      links,
      quickJumps: buildQuickJumps(parsed.owner, parsed.repo, defaultBranch, repoInfo.created_at, repoInfo.pushed_at),
      rateLimit: lastRateLimit
    };

    // 写入缓存
    historyCache.set(cacheKey, { data: payload, at: Date.now() });
    return sendJson(res, 200, payload);
  } catch (err) {
    const status = err.statusCode || 500;
    return sendJson(res, status, { error: err.message || '服务器内部错误' });
  }
}

/**
 * 生成"按时间段快速跳转"的链接清单
 * 覆盖仓库第一年 / 每一年 / 最近一年
 */
function buildQuickJumps(owner, repo, branch, createdAt, pushedAt) {
  if (!createdAt) return [];
  const startYear = new Date(createdAt).getUTCFullYear();
  const endYear = new Date(pushedAt || Date.now()).getUTCFullYear();
  const jumps = [];
  for (let y = startYear; y <= endYear; y++) {
    jumps.push({
      label: `${y} 年提交`,
      url: dateRangeCommitsUrl(
        owner, repo, branch,
        `${y}-01-01T00:00:00Z`,
        `${y}-12-31T23:59:59Z`
      )
    });
  }
  return jumps;
}

// ========= 推荐仓库 API =========

// 简单内存缓存
const cache = { topStars: null, topStarsAt: 0, trending: null, trendingAt: 0 };
const CACHE_TTL = 6 * 3600 * 1000; // 6 小时

/**
 * 发起一次 HTTPS GET 请求（通用，用于非 GitHub API 的 URL）
 */
function httpsGet(fullUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(fullUrl);
    const req = https.request({
      host: u.host,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('请求超时')));
    req.end();
  });
}

/**
 * API: /api/top-stars — 从 Github-Ranking 解析历史 Stars 前 10
 * 数据源: https://github.com/EvanLi/Github-Ranking
 */
async function handleTopStars(req, res) {
  if (cache.topStars && Date.now() - cache.topStarsAt < CACHE_TTL) {
    return sendJson(res, 200, cache.topStars);
  }
  try {
    const md = await httpsGet('https://raw.githubusercontent.com/EvanLi/Github-Ranking/master/Top100/Top-100-stars.md');
    const lines = md.split('\n').filter(l => l.startsWith('|') && /^\|\s*\d+/.test(l));
    const items = [];
    for (const line of lines.slice(0, 10)) {
      // | 1 | [name](url) | stars | forks | lang | issues | desc | date |
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 7) continue;
      const nameMatch = cells[1].match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (!nameMatch) continue;
      const repoUrl = nameMatch[2];
      const fullName = repoUrl.replace('https://github.com/', '');
      const desc = (cells[6] || '').replace(/^"|"$/g, '');
      items.push({
        fullName,
        description: desc,
        stars: parseInt(cells[2]) || 0,
        language: cells[4] === 'None' ? null : cells[4],
        url: repoUrl
      });
    }
    cache.topStars = items;
    cache.topStarsAt = Date.now();
    return sendJson(res, 200, items);
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
}

/**
 * API: /api/trending — 近期热门仓库（最近 7 天内创建、按 stars 排序）
 */
async function handleTrending(req, res) {
  if (cache.trending && Date.now() - cache.trendingAt < CACHE_TTL) {
    return sendJson(res, 200, cache.trending);
  }
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const resp = await githubRequest('/search/repositories', {
      q: `created:>${since}`,
      sort: 'stars',
      order: 'desc',
      per_page: 10
    });
    if (resp.status !== 200) {
      return sendJson(res, 502, { error: 'GitHub API 请求失败' });
    }
    const items = (resp.body.items || []).map(r => ({
      fullName: r.full_name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      url: r.html_url
    }));
    cache.trending = items;
    cache.trendingAt = Date.now();
    return sendJson(res, 200, items);
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
}

// ========= HTTP 工具 =========

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname || '/');
  if (pathname === '/') pathname = '/index.html';

  // 防止路径穿越
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, 'public', safePath);
  const publicDir = path.join(__dirname, 'public');
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stat.size });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ========= 启动服务器 =========

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API 路由
  if (pathname === '/api/history' && req.method === 'GET') {
    return handleHistoryApi(req, res, parsedUrl);
  }
  if (pathname === '/api/top-stars' && req.method === 'GET') {
    return handleTopStars(req, res);
  }
  if (pathname === '/api/trending' && req.method === 'GET') {
    return handleTrending(req, res);
  }
  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      token: GITHUB_TOKEN ? 'configured' : 'none',
      time: new Date().toISOString(),
      rateLimit: lastRateLimit,
      historyCacheSize: historyCache.size
    });
  }

  // 静态资源
  return serveStatic(req, res);
});

// Vercel Serverless 环境：导出 request handler，不监听端口
// 本地环境：正常 listen
if (process.env.VERCEL) {
  module.exports = (req, res) => server.emit('request', req, res);
} else {
  server.listen(PORT, () => {
    console.log('========================================');
    console.log(`  GitVision 已启动（GitHub 仓库历史全景总结工具）`);
    console.log(`  本地访问: http://localhost:${PORT}`);
    console.log(`  GitHub Token: ${GITHUB_TOKEN ? '已配置' : '未配置（建议设置 GITHUB_TOKEN 环境变量以提升限流额度）'}`);
    console.log('========================================');
  });
}
