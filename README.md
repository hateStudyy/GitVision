<div align="center">

# GitVision

**The full story of any GitHub repo — in one page.**

Paste a repo URL. Get the complete history: first commit, interactive timeline, commit classification, milestones, and quick links — all in seconds.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-gitvision.vercel.app-blue?style=for-the-badge)](https://gitvision-9fjzpv1d0-yingges-projects.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-green?style=flat-square)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)

**[English](README.md)** | **[中文](README.zh-CN.md)**

</div>

---

## Features

- **First Commit Finder** — One click to the very first commit of any repo (something GitHub doesn't link to directly)
- **Interactive Timeline** — Year-by-year commit bars expanding into monthly detail. See when a project was most active, when it slowed down, when it picked back up
- **Precise Stats** — Integrates GitHub Statistics API for exact weekly contribution data; falls back to smart sampling when stats aren't cached yet
- **Commit Classification** — Rule-based categorization into Feat / Fix / Refactor / Perf / Docs / Test / Chore (supports English & Chinese commit messages)
- **Milestone Tracking** — Tags and releases at a glance
- **Quick Links Hub** — Direct links to contributors, releases, yearly commits, pulse, search — links that normally take several clicks to find
- **Trending & Top Repos** — Browse the top 100 most-starred repos and this week's trending projects from the homepage
- **Zero Dependencies** — Pure Node.js + vanilla HTML/CSS/JS. No framework, no build step

## Quick Start

```bash
git clone https://github.com/hateStudyy/GitVision.git
cd GitVision
node server.js
```

Open http://localhost:3000 and paste any repo URL.

### With GitHub Token (recommended)

Unauthenticated: 60 requests/hr. Authenticated: **5,000 requests/hr**.

```bash
GITHUB_TOKEN=ghp_your_token_here node server.js
```

Get a token at https://github.com/settings/tokens (no special scopes needed for public repos).

## Try It

Some repos with interesting histories:

| Repo | What you'll see |
|------|-----------------|
| `torvalds/linux` | 30+ years, 1M+ commits |
| `facebook/react` | Explosive growth since 2013 |
| `vuejs/core` | Consistent single-maintainer cadence |
| `rust-lang/rust` | Massive community contribution pattern |

## Screenshots

<div align="center">
<i>Paste a URL → full panoramic analysis in seconds</i>
</div>

## How It Works

1. **Parses** the input URL (supports `owner/repo`, full URLs, SSH, `.git` suffix, branch paths)
2. **Fetches** repo metadata, commit history (sampled), tags, and Statistics API data via GitHub REST API — typically **8–10 API calls** total
3. **Analyzes** commits by message patterns, builds monthly timeline, detects milestones
4. **Caches** results for 10 minutes to minimize API usage
5. **Renders** everything in a single-page dashboard with native HTML/CSS/JS

## API

GitVision exposes a simple JSON API for integration:

```
GET /api/history?url=owner/repo     → Full analysis result
GET /api/refresh-stats?url=owner/repo → Refresh timeline with precise Stats API data
GET /api/trending                   → Trending repos this week
GET /api/health                     → Health check + token status
```

## Deploy

### Vercel (one click)

```bash
npx vercel --prod
```

Set `GITHUB_TOKEN` in Vercel Environment Variables for higher rate limits.

### Docker / VPS

```bash
PORT=3000 GITHUB_TOKEN=ghp_xxx node server.js
```

No build step. No `node_modules`. Just run it.

## Project Structure

```
GitVision/
├── server.js          # Backend (pure Node.js, zero deps)
├── package.json       # Metadata (empty dependencies)
└── public/
    ├── index.html     # Single page
    ├── style.css      # Dark theme, GitHub-inspired
    └── app.js         # Frontend logic (vanilla JS)
```

## Contributing

Issues and PRs welcome. Since the project has zero dependencies, contributions are easy to review and test — just `node server.js` and you're running.

## License

MIT
