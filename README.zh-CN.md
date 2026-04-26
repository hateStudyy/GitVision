**[English](README.md)** | **[中文](README.zh-CN.md)**

# GitVision · GitHub 仓库历史全景总结工具

一个纯原生 Node.js + 原生前端实现的 Web 工具，粘贴任意 GitHub 仓库地址即可：

- 一键直达该仓库的 **第一次提交**（解决 GitHub 原生无法快速跳到最早 commit 的痛点）
- 自动抓取完整提交历史概览、tag 列表、里程碑节点
- 按时间线 / 类别（feat / fix / refactor / perf / docs / test / chore）摘要整个项目的发展脉络
- 所有跳转链接严格遵循 GitHub 官方 URL 规则，可直接在浏览器打开

---

## 技术特点

- **后端**：纯原生 Node.js，仅使用内置模块（`http` / `https` / `fs` / `url` / `path`），**无任何第三方依赖**
- **前端**：原生 HTML + CSS + JavaScript，无框架
- **数据源**：官方 GitHub REST API（`api.github.com`），不克隆仓库、不下载源码，仅拉取元数据
- **跳转链接**：使用 GitHub 原生公开 URL 规则（`/commit/<sha>`、`/commits/<branch>?page=N`、`?since=&until=` 等），永久有效

---

## 项目目录

```
GitVision/
├── server.js          # 后端服务器（纯原生 Node.js）
├── package.json       # 项目元信息（无任何 dependencies）
├── public/            # 前端静态资源
│   ├── index.html     # 主页面
│   ├── style.css      # 样式
│   └── app.js         # 前端逻辑
└── README.md          # 本文档
```

---

## 启动方式

### 1. 环境要求

- Node.js **≥ 18.0.0**

### 2. 启动

```bash
cd GitVision
node server.js
```

或：

```bash
npm start
```

控制台输出：

```
========================================
  GitVision 已启动（GitHub 仓库历史全景总结工具）
  本地访问: http://localhost:3000
========================================
```

浏览器打开 http://localhost:3000 即可使用。

### 3. 可选：配置 GitHub Token（强烈推荐）

GitHub API 对未认证请求限流为 **60 次/小时**，认证后为 **5000 次/小时**。

获取 Token：https://github.com/settings/tokens（无需任何权限，**public_repo** 即可）

启动时附加环境变量：

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx node server.js
```

自定义端口：

```bash
PORT=8080 GITHUB_TOKEN=ghp_xxx node server.js
```

---

## 使用说明

1. 在输入框粘贴任意 GitHub 仓库地址，支持的格式：
   - `https://github.com/torvalds/linux`
   - `https://github.com/facebook/react.git`
   - `https://github.com/vuejs/vue/tree/dev`
   - `git@github.com:microsoft/vscode.git`
   - `owner/repo` 短格式（如 `rust-lang/rust`）
2. 点击「分析仓库」或按回车
3. 结果分区展示：
   - ① 仓库基础信息
   - ② 项目整体简介（自然语言）
   - ③ **一键直达 GitHub 原生链接**（含首次提交 / 早期提交列表页 / 按年份筛选 / Releases / Tags / 贡献者 / 搜索）
   - ④ 第一次提交详情（哈希、作者、时间、消息）
   - ⑤ 完整历史时间线（按月柱状图）
   - ⑥ 关键版本 & 里程碑
   - ⑦ 提交分类摘要（新增 / 修复 / 重构 / 优化 / 文档 / 测试 / 杂项）
   - ⑧ 最新 20 条 & 最早 20 条提交列表

---

## 核心链接生成规则

所有跳转链接严格遵循 GitHub 官方 URL 规范：

| 功能 | URL 模板 |
|------|----------|
| 单次提交 | `https://github.com/{owner}/{repo}/commit/{sha}` |
| 提交列表某一页 | `https://github.com/{owner}/{repo}/commits/{branch}?page=N` |
| 最早提交锚点 | `https://github.com/{owner}/{repo}/commits/{branch}?after={sha}+0` |
| 按日期筛选 | `https://github.com/{owner}/{repo}/commits/{branch}?since=YYYY-MM-DD&until=YYYY-MM-DD` |
| Releases | `https://github.com/{owner}/{repo}/releases` |
| Tag 发布页 | `https://github.com/{owner}/{repo}/releases/tag/{tagName}` |
| 贡献者 | `https://github.com/{owner}/{repo}/graphs/contributors` |

其中「跳到最早提交列表页」的实现：先通过 GitHub API 的 `Link` 响应头解析出总页数 `lastPage`，然后拼出 `?page=lastPage` 直达最后一页（即最早那批提交）——这就是 GitHub 网页端原生没有直达入口但接口完全支持的能力。

---

## 异常处理

| 情况 | 返回提示 |
|------|----------|
| URL 无法解析 | "无法解析仓库地址，请确认是合法的 GitHub 仓库 URL" |
| 仓库不存在 / 私有 | "仓库不存在或为私有仓库（无权限访问）" |
| API 限流 | "GitHub API 限流，请稍后再试或配置 GITHUB_TOKEN 环境变量" |
| 网络超时 | 20 秒请求超时会自动终止并提示 |

---

## 接口说明（可选，便于二次集成）

### `GET /api/history?url=<repo_url>`

返回 JSON，结构概要：

```json
{
  "owner": "torvalds",
  "repo": "linux",
  "basic": { "fullName": "...", "description": "...", "defaultBranch": "master", ... },
  "stats": { "totalCommitsEstimate": "≥ 1000000", "lastPage": 10023, "tagCount": 876 },
  "firstCommit": { "sha": "1da177e4...", "date": "2005-04-16T...", "url": "..." },
  "latestCommits": [...],
  "earliestCommits": [...],
  "tags": [...],
  "milestones": [...],
  "timeline": [{ "month": "2005-04", "count": 12 }, ...],
  "categorized": { "feat": [...], "fix": [...], ... },
  "links": { "firstCommit": "...", "earlyCommitsPage": "...", ... },
  "quickJumps": [{ "label": "2005 年提交", "url": "..." }, ...]
}
```

### `GET /api/health`

健康检查 + Token 配置状态。

---

## FAQ

**Q: 为什么"估算提交数"前面有个 `≥`？**
A: GitHub REST API 不直接返回总提交数，只能通过分页 `Link` 头推算。每页固定 100 条，最后一页数量未知，因此显示为「≥ (总页数-1) × 100」。

**Q: 为什么首次提交展示的是特定 SHA 而不是所谓的「empty tree」？**
A: 本工具取的是默认分支上的最早一条提交（即该分支的根提交），这与 GitHub 网页端按默认分支翻到最后一页看到的结果完全一致。

**Q: 是否支持私有仓库？**
A: 支持，只需在 Token 中勾选 `repo` 权限即可。默认只需 `public_repo`。

**Q: 为什么是"规则驱动"的摘要而不是调用 LLM？**
A: 题目要求轻量、无第三方依赖。基于 commit message 前缀 + 中英文关键词分类已经能覆盖绝大多数项目（因为绝大多数成熟项目都使用 conventional commits 或中文前缀）。如需接入 LLM，在 `server.js` 的 `summarizeCommits` 处替换即可。

---

## License

MIT
