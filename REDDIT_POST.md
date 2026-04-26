# I built GitVision — a tool that gives you the full history of any GitHub repo at a glance

**Live demo:** https://gitvision-9fjzpv1d0-yingges-projects.vercel.app  
**GitHub:** https://github.com/hateStudyy/GitVision

## The Problem

Ever wanted to quickly understand the full story behind a GitHub repository? Like when was the first commit, how active is it over the years, what kind of work is being done? GitHub gives you bits and pieces across different pages, but no single view that tells the whole story.

## What GitVision Does

Paste any GitHub repo URL and get a complete panoramic summary in seconds:

- **First Commit Finder** — Instantly jump to the very first commit of any repo (something GitHub doesn't link to directly)
- **Interactive Timeline** — Year-by-year commit volume bars that expand into monthly detail. See exactly when a project was most active, when it slowed down, and when it picked back up
- **Smart Commit Classification** — Automatically categorizes commits into Feature / Fix / Refactor / Perf / Docs / Test / Chore based on commit message analysis (supports both English and Chinese)
- **Milestone Detection** — Surfaces version tags and releases so you can trace the project's evolution
- **Quick Links Hub** — One-click links to contributors, releases, commit search by year, pulse, and more — links that would normally take several clicks to find on GitHub
- **Trending & Top Repos** — Browse the top 100 most-starred repos and this week's trending projects right from the homepage

## Technical Details

- **Zero dependencies** — Pure Node.js backend + vanilla HTML/CSS/JS frontend. No React, no Next.js, no build step
- **GitHub Statistics API integration** — Uses GitHub's precise weekly contribution data when available; falls back to smart sampling for repos where stats haven't been computed yet
- **Efficient API usage** — Full analysis in ~8-10 API calls with result caching. Works without a token (60 req/hr) or with one (5,000 req/hr)
- **One-click deploy** — Works on Vercel, or just `node server.js` locally

## Why I Built This

I kept finding myself clicking through dozens of pages on GitHub trying to understand a repo's history before diving in — especially for large open-source projects. I wanted something that could answer "what's the story of this project?" in one page.

## Try It Out

Just paste any repo URL and hit analyze. Some fun ones to try:

- `torvalds/linux` — 30+ years of history
- `facebook/react` — watch the explosive growth
- Any of your own repos — you might be surprised by your own commit patterns

Would love to hear feedback. What would you want to see added?
