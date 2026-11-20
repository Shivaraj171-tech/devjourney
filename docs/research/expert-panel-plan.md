# Expert panel: combined plan

Sources: [`panel-ui.md`](panel-ui.md) (UI/UX lead), [`panel-curriculum.md`](panel-curriculum.md) (learning science), [`panel-market.md`](panel-market.md) (market, with sources). This page is the engineering lead's synthesis: what we build now, later, or not at all, and why.

## What the three experts agree on

1. **The positioning is right and the gap is real.** No free, browser-only beginner game where catching AI mistakes is the core activity was found (market). The skill is increasingly tested in hiring (market). The research summarised by the curriculum and market panels supports asking "why" after using AI-generated code.
2. **The core loop must make learners *judge*, not guess.** Quizzes leak the answer through length (82% longest-correct), Byte is wrong too often (always-reject wins), and learners can let the test run decide for them (curriculum).
3. **The ticket page asks too much of a beginner at once.** The goal is below the fold, there are up to 5 tabs, the editable file can scroll out of view, and phones are not usable for typing code (UI).
4. **Don't build expensive things yet.** No live AI tutor, no accounts/multiplayer, no "build any app" mode until there's evidence of demand (market).

Where they pull in different directions: curriculum wants *more* task formats; UI wants *fewer* panels. Resolution: new formats live inside one compact "task" area in the left pane, and the lesson/quiz/hints stop being tabs.

## Build now (in progress or done)

| # | Item | From | Effort | Server? | Status |
|---|---|---|---|---|---|
| 1 | Shuffle quiz and warm-up choices | Curriculum | S | No | ✅ live |
| 2 | "Almost there" run feedback, new-badge pop-ups | Fun roadmap | S | No | ✅ live |
| 3 | Fix quiz length cues and joke distractors; swap attitude questions for "which input catches it" | Curriculum | M | No | 🔨 content expert |
| 4 | Calibrate Byte to ~55–65% correct, more kinds of AI mistakes; Byte's first appearance is wrong | Curriculum + UI | S–M | No | 🔨 content expert |
| 5 | Ticket page: goal first, fewer tabs, editable file first, progress pill, review instruction bar, phone 3-step layout, focus/contrast | UI | M–L | No | 🔨 design engineer A |
| 6 | HQ: hide empty sections on first visit, "Today" card for returning players, current floor only, sprint-board rooms, copy fixes, a11y | UI | M | No | 🔨 design engineer B |
| 7 | Shareable "caught X of Byte's bugs" + Open Graph meta | Market | S | No | 🔨 design engineer B |
| 8 | New formats: Predict the output, Break Byte's code, Put the lines in order | Curriculum | M–L | No | 🔨 curriculum engineer |
| 9 | Decide before evidence: accept/reject + "why" before the verdict | Curriculum + Market | M | No | 🔨 curriculum engineer |

## Build next (no server)

- Final no-hint project on an unseen module + a short skills check (curriculum #3).
- Fill concept gaps: `try/except` done right, `while`, slicing/string methods, tuples, nested data, sorting, files (curriculum #4).
- New AI-mistake tickets: Byte edits the test, invents a parameter, explains an error wrongly, adds unrequested extras (curriculum #10).
- Spaced, mixed warm-ups (3 per session, weighted to missed concepts) + "mystery bug" tickets (curriculum #7).
- Trace tables powered by the debugger's recordings (curriculum #9).
- Mobile: faster first load and offline caching of Python/editor files; test on a real low-end Android and an iPhone (market risk).
- Teacher mode without accounts: class code + progress export (market).

## Needs your decision (costs money or accounts)

- **Analytics** (privacy-friendly, e.g. a hosted counter): needed to learn what works; requires choosing a provider and an account.
- **Real AI features** (AI explains your mistake, AI grades "explain it back"): needs a backend and an API budget. Rough model-cost estimates are in the market report; treat them as approximate.
- **Pro tier / payments, certificates, classroom dashboard:** test demand first (waitlist), per the market report's 90-day plan.

## Don't build now

- Live chat AI tutor (free alternatives exist; needs a backend; abuse risk).
- Real multiplayer and social accounts.
- A general "build any app" vibe-coding mode (head-on with well-funded tools).

## How we ship

Every change: lint + types clean, content validation (which runs every ticket and every Byte suggestion), unit tests, the full Playwright suite in a real browser, then merge to `main`, which auto-deploys to https://shivaraj171-tech.github.io/devjourney/.
