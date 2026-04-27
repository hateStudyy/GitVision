/**
 * GitVision 多语言字典 + 切换逻辑
 * 暴露全局：window.I18N（取词）、window.setLang（切换）、window.getLang（当前语言）
 */
(function () {
  'use strict';

  const DICT = {
    zh: {
      'site.title': 'GitVision · GitHub 仓库历史全景总结',
      'site.subtitle': '粘贴任意 GitHub 仓库地址，一键直达首次提交 / 早期历史 / 版本里程碑',

      'input.placeholder': '例如：https://github.com/torvalds/linux 或 facebook/react',
      'input.analyze': '分析仓库',
      'input.empty': '请输入 GitHub 仓库地址',

      'rec.tab.top': 'Stars 排行榜',
      'rec.tab.trending': '近期 Trending',
      'rec.tab.classics': '知名开源项目',
      'rec.source.label': '数据来源：',
      'rec.source.daily': '每日更新',
      'rec.source.trending': '最近 7 天新项目按 Stars 排序',
      'rec.source.classics': '经典项目，了解开源历史',
      'rec.loadFailed': '加载失败',
      'rec.empty': '暂无数据',
      'rec.analyze': '分析',
      'rec.goto': '跳转',
      'rec.back': '返回推荐列表',

      'common.loading': '加载中…',
      'common.none': '（无）',
      'common.dash': '—',
      'common.noData': '无数据',

      'panel.basic': '① 仓库基础信息',
      'panel.overview': '② 项目整体简介',
      'panel.quickLinks': '③ 一键直达（GitHub 原生链接）',
      'panel.quickLinks.desc': '解决 GitHub 原生无法快速跳到最早提交的痛点，所有链接永久有效',
      'panel.yearJumps': '按年份快速筛选',
      'panel.firstCommit': '④ 第一次提交（项目起点）',
      'panel.timeline': '⑤ 完整历史时间线',
      'panel.milestones': '⑥ 关键版本 & 里程碑',
      'panel.categorized': '⑦ 提交分类摘要（新增 / 修复 / 重构 / 优化 / 其他）',
      'panel.commits': '⑧ 最新 20 条 & 最早 20 条提交',
      'panel.commits.latest': '最新提交',
      'panel.commits.earliest': '最早提交',

      'basic.repo': '仓库',
      'basic.description': '描述',
      'basic.language': '主语言',
      'basic.stars': 'Stars',
      'basic.forks': 'Forks',
      'basic.watchers': 'Watchers',
      'basic.openIssues': 'Open Issues',
      'basic.license': 'License',
      'basic.defaultBranch': '默认分支',
      'basic.createdAt': '创建时间',
      'basic.updatedAt': '最近更新',
      'basic.pushedAt': '最近推送',
      'basic.totalCommits': '估算提交数',
      'basic.tagCount': 'Tag 数量',
      'basic.archived': '归档状态',
      'basic.archived.yes': '已归档',
      'basic.archived.no': '活跃',

      'overview.is': '是一个',
      'overview.multilang': '多语言',
      'overview.project': '项目，',
      'overview.createdOn': '创建于',
      'overview.lastUpdate': '，最近更新于',
      'overview.intro': '项目简介：',
      'overview.has': '当前获得',
      'overview.starsLabel': 'Stars、',
      'overview.forksLabel': 'Forks，共发布',
      'overview.tagsLabel': '个版本标签。',
      'overview.archived': '仓库已归档，不再活跃维护。',
      'overview.active': '仓库仍在活跃维护中。',
      'overview.peak': '开发最活跃的月份是',
      'overview.peakSuffix': '，共有',
      'overview.peakCommits': '次提交。',
      'overview.topics': '主题标签：',

      'qlink.firstCommit.title': '⭐ 直达：第一次提交',
      'qlink.firstCommit.desc': '项目起点 commit，单页永久链接',
      'qlink.earlyCommitsPage.title': '📜 直达：早期提交列表页',
      'qlink.earlyCommitsPage.desc': '直接跳到最早那一页，无需翻页',
      'qlink.commitsLatest.title': '🕒 最新提交列表',
      'qlink.commitsLatest.desc': '默认分支最新 commits',
      'qlink.releases.title': '🏷 Releases 发布页',
      'qlink.releases.desc': '所有版本发布记录',
      'qlink.tags.title': '🔖 Tags 标签页',
      'qlink.tags.desc': '所有版本标签',
      'qlink.contributors.title': '👥 贡献者图表',
      'qlink.contributors.desc': '按贡献量排序的开发者',
      'qlink.pulse.title': '📈 Pulse 活动摘要',
      'qlink.pulse.desc': 'GitHub 原生活动周报',
      'qlink.searchCommits.title': '🔍 搜索提交消息',
      'qlink.searchCommits.desc': 'GitHub 原生 commit 搜索',
      'qlink.empty': '暂无数据',

      'fc.notFound': '未能获取到首次提交信息',
      'fc.author': '作者：',
      'fc.date': ' · 时间：',
      'fc.openOnGithub': '→ 在 GitHub 打开首次提交',

      'tl.exact.tip': '数据来自 GitHub Statistics API，包含每位贡献者的逐周提交记录，精确到每一次 commit',
      'tl.sample.tip': '通过分页采样估算，可能与实际提交数存在偏差｜GitHub 精确统计需要后台计算，首次请求会触发计算，耗时从几秒到数分钟不等，取决于仓库大小和贡献者数量｜点击"刷新"将在后台持续等待（最长 3 分钟），期间可继续浏览，计算完成后时间线会自动更新',
      'tl.badge.exact': '精确统计',
      'tl.badge.sample': '采样估算',
      'tl.refresh': '尝试获取精确数据',
      'tl.refresh.computing': '等待 GitHub 计算中…',
      'tl.refresh.background': '后台等待中…',
      'tl.refresh.bgSuffix': 's（可继续浏览）',
      'tl.refresh.notReady': '暂未就绪，可稍后再试',
      'tl.refresh.failed': '请求失败',
      'tl.refresh.success': '已获取精确统计数据，时间线已更新',
      'tl.span': '跨度',
      'tl.year': '年 · ',
      'tl.months': '个月',
      'tl.activeMonths': '有提交月份',
      'tl.activeMonthsUnit': '个',
      'tl.totalCommits': '总提交数',
      'tl.estimated': '（估算）',
      'tl.peak': '峰值',
      'tl.peakUnit': '次/月',
      'tl.source': '数据来源：',
      'tl.times': '次',
      'tl.clickHint': '点击上方年份柱查看月份详情',
      'tl.collapse': '收起',
      'tl.yearTotal': '年 · 共',
      'tl.yearTotalSuffix': '次提交',
      'tl.monthNames': ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],

      'ms.empty': '无里程碑',
      'ms.start': '起点',
      'ms.version': '版本',
      'ms.releasePage': '发布页',
      'ms.commit': '提交',
      'ms.open': '打开',
      'ms.firstCommitTitle': '首次提交（项目起点）',
      'ms.tagTitle': '版本标签 {tag}',
      'qjump.yearLabel': '{year} 年提交',

      'cat.feat': '新增功能 (Feat)',
      'cat.fix': '修复 (Fix)',
      'cat.refactor': '重构 (Refactor)',
      'cat.perf': '性能优化 (Perf)',
      'cat.docs': '文档 (Docs)',
      'cat.test': '测试 (Test)',
      'cat.chore': '杂项 (Chore)',
      'cat.empty': '— 无 —',

      'status.analyzing': '正在分析仓库，通过 GitHub API 拉取数据……',
      'status.error': '错误：',
      'status.requestFail': '请求失败',
      'status.networkErr': '网络异常：',
      'status.done': '分析完成 · ',
      'status.quota': ' · API 配额：'
    },

    en: {
      'site.title': 'GitVision · The full story of any GitHub repo',
      'site.subtitle': 'Paste any GitHub repo URL — jump to the first commit, browse early history, and trace version milestones in one click',

      'input.placeholder': 'e.g. https://github.com/torvalds/linux or facebook/react',
      'input.analyze': 'Analyze',
      'input.empty': 'Please enter a GitHub repository URL',

      'rec.tab.top': 'Top by Stars',
      'rec.tab.trending': 'Recent Trending',
      'rec.tab.classics': 'Famous Projects',
      'rec.source.label': 'Source: ',
      'rec.source.daily': 'updated daily',
      'rec.source.trending': 'New projects from the past 7 days, sorted by stars',
      'rec.source.classics': 'Classic projects to explore open-source history',
      'rec.loadFailed': 'Failed to load',
      'rec.empty': 'No data',
      'rec.analyze': 'Analyze',
      'rec.goto': 'Open',
      'rec.back': 'Back to recommendations',

      'common.loading': 'Loading…',
      'common.none': '(none)',
      'common.dash': '—',
      'common.noData': 'No data',

      'panel.basic': '① Repository Info',
      'panel.overview': '② Project Overview',
      'panel.quickLinks': '③ Quick Links (Native GitHub URLs)',
      'panel.quickLinks.desc': 'Solves GitHub\'s missing direct link to the earliest commit — all URLs are permanent',
      'panel.yearJumps': 'Filter by Year',
      'panel.firstCommit': '④ First Commit (Project Origin)',
      'panel.timeline': '⑤ Full History Timeline',
      'panel.milestones': '⑥ Versions & Milestones',
      'panel.categorized': '⑦ Commit Classification (Feat / Fix / Refactor / Perf / etc.)',
      'panel.commits': '⑧ Latest 20 & Earliest 20 Commits',
      'panel.commits.latest': 'Latest Commits',
      'panel.commits.earliest': 'Earliest Commits',

      'basic.repo': 'Repo',
      'basic.description': 'Description',
      'basic.language': 'Language',
      'basic.stars': 'Stars',
      'basic.forks': 'Forks',
      'basic.watchers': 'Watchers',
      'basic.openIssues': 'Open Issues',
      'basic.license': 'License',
      'basic.defaultBranch': 'Default Branch',
      'basic.createdAt': 'Created',
      'basic.updatedAt': 'Last Updated',
      'basic.pushedAt': 'Last Push',
      'basic.totalCommits': 'Total Commits (est.)',
      'basic.tagCount': 'Tags',
      'basic.archived': 'Status',
      'basic.archived.yes': 'Archived',
      'basic.archived.no': 'Active',

      'overview.is': 'is a',
      'overview.multilang': 'multi-language',
      'overview.project': ' project, ',
      'overview.createdOn': 'created on ',
      'overview.lastUpdate': ', last updated on ',
      'overview.intro': 'Description: ',
      'overview.has': 'Currently has ',
      'overview.starsLabel': ' stars, ',
      'overview.forksLabel': ' forks, with ',
      'overview.tagsLabel': ' release tags. ',
      'overview.archived': 'The repo is archived and no longer actively maintained.',
      'overview.active': 'The repo is actively maintained.',
      'overview.peak': 'The most active month was ',
      'overview.peakSuffix': ', with ',
      'overview.peakCommits': ' commits.',
      'overview.topics': 'Topics: ',

      'qlink.firstCommit.title': '⭐ Jump: First Commit',
      'qlink.firstCommit.desc': 'Permanent link to the project origin commit',
      'qlink.earlyCommitsPage.title': '📜 Jump: Earliest Commit Page',
      'qlink.earlyCommitsPage.desc': 'Skip directly to the last page — no manual paging',
      'qlink.commitsLatest.title': '🕒 Latest Commits',
      'qlink.commitsLatest.desc': 'Newest commits on the default branch',
      'qlink.releases.title': '🏷 Releases',
      'qlink.releases.desc': 'All published releases',
      'qlink.tags.title': '🔖 Tags',
      'qlink.tags.desc': 'All version tags',
      'qlink.contributors.title': '👥 Contributors',
      'qlink.contributors.desc': 'Developers ranked by contribution',
      'qlink.pulse.title': '📈 Pulse',
      'qlink.pulse.desc': 'GitHub native activity report',
      'qlink.searchCommits.title': '🔍 Search Commits',
      'qlink.searchCommits.desc': 'Native GitHub commit search',
      'qlink.empty': 'No data',

      'fc.notFound': 'Could not retrieve the first commit',
      'fc.author': 'Author: ',
      'fc.date': ' · Date: ',
      'fc.openOnGithub': '→ Open first commit on GitHub',

      'tl.exact.tip': 'Data from the GitHub Statistics API — per-contributor weekly commits, precise to every single commit',
      'tl.sample.tip': 'Estimated via paginated sampling — may differ from the actual count | GitHub\'s precise stats are computed in the background, the first request triggers calculation which can take seconds to minutes depending on repo size | Clicking "Refresh" will keep polling in the background (up to 3 minutes); you can continue browsing while waiting',
      'tl.badge.exact': 'Precise',
      'tl.badge.sample': 'Estimated',
      'tl.refresh': 'Try fetching precise data',
      'tl.refresh.computing': 'Waiting for GitHub to compute… ',
      'tl.refresh.background': 'Polling in background… ',
      'tl.refresh.bgSuffix': 's (you can keep browsing)',
      'tl.refresh.notReady': 'Not ready yet, please retry later',
      'tl.refresh.failed': 'Request failed',
      'tl.refresh.success': 'Precise stats fetched — timeline updated',
      'tl.span': 'Spans ',
      'tl.year': ' years · ',
      'tl.months': ' months',
      'tl.activeMonths': 'Active months: ',
      'tl.activeMonthsUnit': '',
      'tl.totalCommits': 'Total commits: ',
      'tl.estimated': ' (est.)',
      'tl.peak': 'Peak ',
      'tl.peakUnit': '/mo',
      'tl.source': 'Source: ',
      'tl.times': '',
      'tl.clickHint': 'Click a year bar above to see monthly detail',
      'tl.collapse': 'Collapse',
      'tl.yearTotal': ' · ',
      'tl.yearTotalSuffix': ' commits',
      'tl.monthNames': ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],

      'ms.empty': 'No milestones',
      'ms.start': 'Origin',
      'ms.version': 'Release',
      'ms.releasePage': 'Release page',
      'ms.commit': 'Commit',
      'ms.open': 'Open',
      'ms.firstCommitTitle': 'First Commit (Project Origin)',
      'ms.tagTitle': 'Tag {tag}',
      'qjump.yearLabel': 'Commits in {year}',

      'cat.feat': 'Features (Feat)',
      'cat.fix': 'Bug Fixes (Fix)',
      'cat.refactor': 'Refactors (Refactor)',
      'cat.perf': 'Performance (Perf)',
      'cat.docs': 'Documentation (Docs)',
      'cat.test': 'Tests (Test)',
      'cat.chore': 'Chores (Chore)',
      'cat.empty': '— none —',

      'status.analyzing': 'Analyzing repository via GitHub API…',
      'status.error': 'Error: ',
      'status.requestFail': 'Request failed',
      'status.networkErr': 'Network error: ',
      'status.done': 'Done · ',
      'status.quota': ' · API quota: '
    }
  };

  function getLang() {
    const saved = localStorage.getItem('gitvision-lang');
    if (saved && DICT[saved]) return saved;
    // 默认根据浏览器语言推断
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  function t(key) {
    const lang = getLang();
    const v = DICT[lang] && DICT[lang][key];
    if (v == null) return DICT.zh[key] || key;
    return v;
  }

  function applyStaticTexts() {
    document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
    // 文本节点
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // 属性
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      // 格式："attr:key" 或多个 "a:k1;b:k2"
      spec.split(';').forEach(pair => {
        const [attr, key] = pair.split(':');
        if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
    // <title>
    document.title = t('site.title');
  }

  function setLang(lang) {
    if (!DICT[lang]) return;
    localStorage.setItem('gitvision-lang', lang);
    applyStaticTexts();
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    // 通知 app.js 重新渲染当前结果（如有）
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  // 初始化
  document.addEventListener('DOMContentLoaded', function () {
    applyStaticTexts();
    const initLang = getLang();
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === initLang);
      b.addEventListener('click', () => setLang(b.dataset.lang));
    });
  });

  window.I18N = { t, getLang, setLang };
  window.t = t;
})();
