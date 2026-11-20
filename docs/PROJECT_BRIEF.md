# DevJourney — Project Brief

Working name; rename freely. A learn-to-code platform where the learner "joins a fictional startup as a junior developer" and progresses through one evolving codebase by solving tickets: bugs, features, incidents and code reviews. It is a complete roadmap from first line of code to job-ready, built to be engaging rather than a list of disconnected puzzles.

The builder is also the first user. Optimise for "fun and useful for me today", structured so it can become a real product later.

## 1. Product vision

### The problem with existing sites
- Problems are disconnected; solving one doesn't build toward anything.
- No story or reason to care.
- Difficulty spikes → people get stuck and quit.
- You end with a solve count, not something you built.
- They train "write an algorithm from scratch", but in the AI era the key skills are reading, debugging, reviewing and verifying code (often AI-written).

### The core idea
- The learner is hired at a fictional startup (placeholder: **Orbit Orders**, a small food-ordering app; must stay fictional).
- The whole roadmap happens in one codebase that grows as the learner progresses.
- Each unit of work is a ticket (10–15 minutes, one clear goal).
- Ticket types:
  - `bug`: bug report + failing behaviour; learner reproduces, fixes, tests pass.
  - `feature`: small feature request with acceptance tests.
  - `incident`: timed "production is down" debugging mission with logs.
  - `review`: learner reviews a pull request (often AI-written) and must find the problems.
  - `read`: questions about unfamiliar code ("where is the discount calculated?").
- Progression: Intern → Junior → Mid → Senior. Each level unlocks harder systems.
- End result: the learner has built a real, working app they can show.

### Roadmap tracks (woven into the story)
1. Foundations: syntax, logic, reading code
2. Building: features, data, APIs
3. Debugging: reproduce, isolate, fix, test
4. Reading big codebases: navigating code you didn't write
5. Systems: databases, performance, security
6. Working with AI: prompting, reviewing and verifying AI-generated code

### Engagement principles
- Short sessions (10–15 min per ticket).
- Smooth difficulty: every ticket needs at most one new concept.
- Visible progress map (company floor / skill tree), not just a counter.
- Consequences: shortcuts taken earlier can resurface as later bugs.
- Hints in stages (nudge → direction → near-answer), never the full answer by default.
- Later: multiplayer (bug-hunt races, reviewing each other's PRs).

## 2. Scope

### MVP
- Season 1, "Your First Week": 10 tickets in Python.
- Single user, no login, progress saved in the browser.
- Web UI: ticket list / progress map, ticket view (story + task), code editor, "Run tests" button, test results, staged hints.

### Not in MVP
- Accounts, auth, payments, leaderboards, multiplayer.
- AI tutor / AI code review (Phase 3; UI should leave room for it).
- Multiple learner languages.
- Server-side code execution, unless in-browser execution proves impossible.

### Later phases
- Phase 2: more seasons, progress map, incidents with logs, review tickets.
- Phase 3: AI hints and AI "senior dev" PR review, accounts, sync, multiplayer.

## 3. Suggested tech stack (NOT yet confirmed)
- Next.js + TypeScript + Tailwind CSS.
- Monaco editor.
- Pyodide for running learner Python in the browser.
  - To verify in current Pyodide docs: whether `pytest` can be installed/run. If not, use a small custom `assert`-based runner.
- `localStorage` for progress (wrapped in try/catch).
- Content as plain files in `content/`, loaded at build time.

## 4. Content format

```
content/
  seasons/
    s01-first-week/
      season.yaml            # title, intro story, order of tickets
      tickets/
        t01-welcome/
          ticket.yaml        # metadata
          story.md           # what the learner sees
          starter/           # code state the learner starts from
          tests/             # tests that must pass
          solution/          # reference solution (never shown by default)
          hints.md           # staged hints, separated by "---"
```

`ticket.yaml`:

```yaml
id: s01-t01
title: "Welcome aboard: fix the greeting"
type: bug            # bug | feature | incident | review | read
level: intern        # intern | junior | mid | senior
track: foundations   # foundations | building | debugging | reading | systems | ai
concepts: [variables, strings]
new_concept: strings # at most one new concept per ticket
estimated_minutes: 10
tests_visible: true
files_editable: [app/greeting.py]
```

### Ticket-type extras
- `read`: no tests/solution needed; `questions.yaml` (3+ questions) is the task.
- `review`: `starter/` is the codebase before the PR; `pr/` holds the PR's changed files as full file text after the change; `review.yaml` has `title`, `author`, `description`, `files` (paths in `pr/`, display order), `issues` (`file`, 1-based `line`, optional `also_lines`, `explain`) and optional `merged` (default false). No tests/solution needed. XP = base − 10 per distinct false-alarm line − hints.
- `incident`: like a bug ticket, plus `logs.txt` (shown in the Logs panel). Optional `time_limit_minutes` in `ticket.yaml` (default 15) sets the speed-bonus timer; the timer never blocks.
- Any ticket (optional): `byte.yaml` for Byte, the office AI. A `suggestion` (`file`, `find` = exact text in the starter file, `replace` = Byte's code, `correct`, `says`, `explain`) is shown as a diff the learner can accept, reject or edit; the validator runs the tests on starter + replacement, so `correct: true` must pass and `correct: false` must fail. A `prompt` card (`goal`, 2–4 `options` of `prompt` / `response_code` / `verdict` good|vague|wrong / `feedback`, `best`) powers the "Ask Byte" tab. Pre-written responses only: no real AI.
- Full details and checks: the docstring of `scripts/validate_content.py`.

### Evolving codebase rule
- Codebase for ticket N+1 = reference solution of ticket N (plus any new files).
- A `read` ticket's result is its `starter/`; a `review` ticket's result is its `starter/`, plus `pr/` on top if `merged: true`.
- The chain continues across seasons in order: the first ticket of season K+1 starts from the last ticket of season K (checked by the validator).
- MVP: store a full `starter/` snapshot per ticket.
- Later: a script that checks `solution(N)` + changes == `starter(N+1)`.

### Content quality checklist (every ticket)
- Story is 3–6 sentences, in-character, explains WHY it matters.
- Starter code fails the tests; reference solution passes them (verified by running).
- Bugs are realistic (off-by-one, wrong condition, None handling, wrong units, mutated shared data), not trick puzzles.
- At most one new concept.

## 5. Repo structure

```
/app                 # Next.js app (routes, pages)
/components          # Editor, TicketView, TestResults, HintPanel, ProgressMap
/lib
  /runner            # Pyodide loading + running tests
  /content           # loading/parsing seasons and tickets
  /progress          # localStorage progress
/content             # seasons and tickets
/scripts             # validate-content: starter fails, solution passes
```

## 6. Milestones
1. **Content first**: tickets t01–t03 + `scripts/validate-content`.
2. **Runner**: Pyodide runner returning pass/fail per test and error output.
3. **UI**: ticket list → ticket page (story, editor, run tests, results, hints).
4. **Progress**: solved tickets and per-ticket code in localStorage.
5. **Finish Season 1**: t04–t10, then polish.

## 7. Working agreement
- Explain decisions briefly as you go.
- Ask before adding dependencies, changing the content format, or making big architecture choices.
- Small steps; after each milestone, explain how to run and try it.
- Simple, readable code; few abstractions in the MVP.
- Tests for the runner and the content validator.
- Never invent library functions or APIs.
