# Reddit 推广文案 — r/webdev

> 目标：拿 stars · 主推痛点 · 风格 Show-HN 冷静技术向 · 多用图表/列表

---

## 主帖（r/webdev）

**Title:**
> I built GitVision — paste any GitHub repo URL, get its full history on one page. No more clicking through 47 pages to find the first commit.

**Flair:** `Showoff Saturday` (周六发) / `Article` (其他时间)

**Body:**

```
GitHub gives you a great repo page. But the moment you want to actually understand a project's history, you're in a clicking marathon:

| What you want to know          | Where GitHub hides it                        |
|--------------------------------|----------------------------------------------|
| First commit                   | No direct link. Manual page-back forever.    |
| Commit volume per year         | Insights → Contributors → squint at graph    |
| Releases timeline              | /releases (paginated, no overview)           |
| Commits in 2019                | URL hacking with ?since=&until=              |
| What kind of work was done     | Read every commit message yourself           |

I kept hitting the same walls every time I evaluated a new OSS dependency, so I built **GitVision** — a single-page panoramic view of any GitHub repo.

**Live demo:** https://gitvision-wine.vercel.app
**Repo:** https://github.com/hateStudyy/GitVision

What you get from one URL paste:

- Direct link to the **very first commit** (the one GitHub refuses to link to)
- **Interactive timeline** — yearly commit bars that expand into monthly detail on click
- **Precise stats** via GitHub's Statistics API, with smart fallback to sampling when the cache is cold
- **Auto-classified commits** — Feat / Fix / Refactor / Perf / Docs / Test / Chore (works on English + Chinese commit messages)
- **Per-year quick jumps** — one click to "all commits in 2019"
- **Milestones view** — every release tag with commit + release page links

Tech stack:

- Backend: pure Node.js, **zero dependencies** (no Express, no node_modules)
- Frontend: vanilla HTML/CSS/JS, no build step
- ~8-10 GitHub API calls per analysis, with 10-min in-memory cache
- Bilingual UI (EN/中文) — switches instantly, persists in localStorage
- Deploys to Vercel as-is, or `node server.js` locally

Try it on these for fun:

- `torvalds/linux` — 30+ years of history
- `facebook/react` — watch the 2013 explosion
- your own repo — you'll be surprised what your commit patterns look like

Looking for honest feedback. What would you actually want this to do that it doesn't?
```

---

## 评论区互动模板（提前准备）

Reddit 主帖发布后 30 分钟内是黄金窗口期，**主动写一条 OP 评论**带技术细节，能显著拉互动。

```
A few things I learned building this that might be useful:

1. GitHub's REST API doesn't expose "total commit count" anywhere.
   You have to fetch /commits?per_page=1, parse the `Link` header for
   `rel="last"`, and the page number IS the commit count. That's it.
   That's the only way.

2. The Statistics API (/stats/contributors) is async. First request
   returns 202 + empty body while GitHub computes. For big repos this
   can take minutes. I poll in the background and update the UI when
   ready, so the user isn't blocked.

3. Zero dependencies on the backend was a self-imposed constraint.
   It made the routing/static-serving boilerplate slightly verbose
   but the result deploys in 2 seconds and has nothing to break.
```

**应对常见质疑（提前打草稿）：**

- *"GitHub Insights already shows this"*
  > Insights shows you per-page metrics, not a cross-cutting overview. Try clicking "first commit" on Insights — there's no link. That's the gap.

- *"Why no framework?"*
  > Honest answer: it's a single page. Adding React/Vue would 10x the deploy size and add zero user value. Constraint was fun.

- *"Doesn't this hit rate limits?"*
  > Unauth: 60 req/hr (~6 analyses). With a token: 5,000/hr. Plus 10-min response caching. For demo purposes I run with a token.

- *"Is the Reddit post AI-generated"* (会有人问)
  > No, but the code has Claude-Code co-author commits — I built it pair-programming with Claude. Happy to share the prompts if anyone's curious.

---

## 标题备选（A/B 测试用）

按预期点击率从高到低：

1. **I built GitVision — paste any GitHub repo URL, get its full history on one page. No more clicking through 47 pages to find the first commit.** ← 主推
2. **Why is finding the first commit on GitHub so hard? I got annoyed and built a tool.**
3. **Tired of GitHub's Insights tab? I built a one-page repo history viewer (zero deps, vanilla JS)**
4. **GitVision: see any GitHub repo's full story — first commit, timeline, milestones — in one paste**

避免：
- ❌ "🚀 Excited to share..."（Reddit 立刻折叠）
- ❌ "Game-changing tool"（标题党触发反感）
- ❌ 全大写 / 多 emoji

---

## 发帖时机

最佳：**美东时间周二/周三/周四 上午 9-11 点**（北京时间晚上 9-11 点）
Showoff Saturday 周六也好，但竞争激烈。

---

## 跟进策略

发出去 24 小时内：

- [ ] 每条评论都回（即使是单字 "lol"）
- [ ] 收到的功能建议立刻 GitHub 创 issue 并回复评论 "tracked here: #N"
- [ ] 帖子热度高就同步交叉发 r/SideProject + r/coolgithubprojects（间隔 6 小时以上避免被识别 spam）
- [ ] 收集 stars 数变化，48h 后回主帖更新 "Update: thanks everyone, hit 100 stars 🎉"（这种增长更新会再吃一波流量）

---

## 不要做的事

- ❌ 不要在标题或正文写"please star"——Reddit 极度反感
- ❌ 不要伪装成"用户提问"再自己回答推自己项目
- ❌ 不要 24 小时内重复发到多个 sub
- ❌ 不要在主帖塞超过 2 条链接（Reddit 反 spam 算法会降权）
- ❌ 不要回喷子，删评论比对线划算
```
