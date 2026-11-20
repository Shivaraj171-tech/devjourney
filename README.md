# DevJourney: Orbit Orders HQ (working name)

**Learn to code with an AI teammate, and learn to catch its mistakes.**

More and more code is written by AI. The people who thrive will be the ones who can read it, run it, debug it and decide what ships: the human in the loop. DevJourney teaches exactly that, starting from zero.

You join **Orbit Orders**, a small (fictional) food-delivery startup, as a junior developer. Your teammate **Byte** is an AI that writes code fast but not always right. You grow **one real codebase** by closing short tickets (10–20 minutes): bugs, features, code-reading tasks, reviews of AI-written pull requests, and production incidents.

No accounts, no setup: Python runs in your browser (Pyodide), and progress is saved in your browser.

## What's in it

- **Startup HQ**: the home screen. Each season is a floor of the office and each ticket is a room that unlocks once the previous one is done. A phone mock-up of the Orbit Orders app lights up features as you ship them.
- **Ticket workspace**: a story from a teammate, a 2-minute concept lesson (📘 Learn), a VS Code-style editor (Monaco), "Run tests" as CI checks with plain-language error explanations and a 📍 file/line pointer, a "Done when" checklist, staged hints (each costs a little XP), and a short quiz after merging.
- **Ticket types**: `bug`, `feature`, `read` (answer questions about unfamiliar code), `review` (click the lines with problems in a teammate's or AI's pull request; false alarms cost XP) and `incident` (production is down: logs, a countdown and a speed bonus).
- **Practice formats** (`formats.yaml`, small bonus XP, never a penalty): predict the output, break Byte's code, Parsons puzzles and **📋 trace tables**: fill in each watched variable step by step (a row per line that changes one), then "Check" traces the real code in Pyodide with the debugger's tracer and compares cell by cell, highlighting the first wrong row; "👀 Watch it run" replays the real values line by line (+15 XP within 2 checks, +10 after). On 6 tickets: loops, side effects, `while`, string building, nested data, sorting.
- **Byte, the AI teammate** (learn to code with an AI, and learn to catch its mistakes): on some tickets **🤖 Byte suggests** a change as a small diff. *Accept* applies it to your code, *Reject* leaves it out, *Edit it myself* applies it for you to fix. Some suggestions are right, some are subtly wrong, and you only find out by checking (accept a wrong one and the next test run shows you the lesson). On others, the **💬 Ask Byte** tab lets you pick the prompt you'd send and shows what Byte writes back for each. A **🤖 Human-in-the-loop score** on the HQ and leaderboard tracks bugs caught, suggestions trusted correctly, bugs waved through and best prompts picked (+20 XP per catch, +10 per verified good suggestion or best prompt, never a penalty), with two badges (Bug Catcher, Prompt Pro).
- **Game layer**: XP, ranks (Intern → Trusted Intern → Junior Developer, the promotion lands at the end of Month One), a forgiving daily streak (one missed day is bridged), 11 badges, a daily warm-up session (up to 3 quick questions, spaced and mixed: misses come back sooner, see `lib/game/warmups.ts`), a skill tree of everything you've learned, and an office leaderboard against fictional teammates (including Sam, the rival new hire, and Byte, the AI assistant).
- **Fun layer** ([`docs/research/fun-roadmap.md`](docs/research/fun-roadmap.md)): the merge modal counts your XP up, fills the rank bar and celebrates promotions and "flow" combos (clean merges in a row); **#orbit-team**, a chat on the HQ where teammates and Byte react to what you just shipped; rooms merged or unlocked since your last visit animate once; and at the end of each floor Maya writes your **performance review** (`/review/<season>/`). All motion respects `prefers-reduced-motion`.
- **Content** (`content/`, format in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) section 4, every format checked by `scripts/validate_content.py`):

  | Floor | Season | Tickets | Concepts |
  |---|---|---|---|
  | 1 | Your First Week | 10 | strings, numbers, conditionals, loops, lists, dictionaries, reading code, None, functions, mutable shared data |
  | 2 | Week Two: The AI Pair | 5 | code review, side effects, tracebacks, boolean logic, reviewing diffs |
  | 3 | Month One: Going Live | 6 | classes, JSON, writing tests, security, performance, refactoring |
  | 4 | Month Two: Working with Byte | 5 | verifying AI claims, testing AI code first, hallucinated APIs, regressions, giving AI context |
  | 5 | Month Three: Byte's Bad Habits | 6 | try/except done right, while loops, slicing and string methods, nested data, tuples and sorting, scope creep (AI habits: swallowing errors, invented parameters, editing the test, explaining an error wrongly, unrequested extras) |

  Plus 51 daily warm-ups (`content/warmups/`).

- **🐞 Bug Bounty** (`content/seasons/s50-bug-bounty`, `chain: false` without `final`: a side quest): 8 short "mystery bug" tickets on the HQ (off-by-one, None, mutable default, string slicing, dict KeyError, boolean order, tuple unpacking, swallowed exception), each a small separate module. No concept label and no lesson (interleaved practice: working out *which kind* of bug it is is the task), hints allowed. Each opens once the ticket that taught its concept is solved (`requires:` in ticket.yaml); once solved it reveals "This was an off-by-one bug" and links back to that lesson. It never blocks anything: the final exam stays gated on the last on-chain season.

- **Final exam: Byte's Week Alone** (`content/seasons/s99-final`, `chain: false` + `final: true` in season.yaml): an unseen module (the loyalty points service), 3 tickets (review Byte's PR with 3 mistakes, fix a bug from the logs, write tests that catch Byte's 4 earlier versions). Exam mode: no hints, lesson, Byte or concept label; normal CI checks. It opens when the nearest on-chain season before it is complete (`lib/content/order.ts`), so new seasons slot in before it with no code change.
- **Skills check** (`/skills-check/`, `content/assessment/skills-check.yaml`): 12 questions (predict the output, which input catches the bug, spot the bug line, pick the right one of Byte's 3 answers), every answer verified by running it. Taken as a skippable baseline after onboarding and again when the final exam opens; "Baseline 5/12 → Final 11/12" shows on the HQ, the performance review and as a shareable line. Merging the 3 exam tickets and taking the final check unlocks the printable **Human in the loop: verified** certificate (`/certificate/`).
- **Research**: competitor analysis in [`docs/research/competitors.md`](docs/research/competitors.md).

## Run it

Requires Node 20+ and Python 3 (Python is only for the content tools).

```bash
npm install
```
```bash
npm run dev
```
Then open http://localhost:3000.

Production build (fully static site in `out/`, deployable to any static host):
```bash
npm run build
```
```bash
npm start
```
That serves `out/` at http://localhost:3000.

## Tests and checks

| Command | What it checks |
|---|---|
| `npm run validate-content` | Every ticket: starter fails its tests, solution passes, metadata/hints/quiz/lesson valid, codebase evolves ticket to ticket (needs `pip install pyyaml`) |
| `python3 -m unittest discover -s scripts/tests` | Tests for the Python test runner and the content validator |
| `npm run test:unit` | Game rules, error explanations, checklist parsing |
| `npm run e2e` | Playwright end-to-end: plays every ticket of every season in a real browser (Python in Pyodide) |
| `npm run lint` | ESLint |

## How it works

- `content/`: seasons and tickets (story, lesson, starter code, tests, reference solution, hints, quiz). Read at build time; the reference solution is never sent to the browser.
- `lib/runner/test_runner.py`: a tiny stdlib-only test runner (plain `assert` tests, no pytest). Used by the validator **and** inside the browser.
- `public/runner-worker.js`: web worker that loads Pyodide and runs a ticket's tests on the learner's code. Infinite loops are stopped by a timeout that restarts the worker.
- `lib/runner/tracer.py`: the 🐞 Step through debugger. Re-runs one check with `sys.settrace` in the worker and records each step in the learner's code (line, variables, call stack, printed output; max 300 steps). `lib/debugger/timeline.ts` turns steps into captions and changed-variable highlights; `components/DebuggerPanel.tsx` replays them with the current line highlighted in the editor.
- `scripts/copy-assets.mjs`: copies Pyodide and Monaco from `node_modules` into `public/` (self-hosted, no CDN). Runs automatically before `dev` and `build`.
- `scripts/sw.template.js` → `public/sw.js` (generated by `copy-assets.mjs`, production builds only): a service worker that caches Pyodide, Monaco and the runner on the device, so second visits are fast and opened tickets work offline. Measurements in [`docs/research/mobile-performance.md`](docs/research/mobile-performance.md).
- `lib/progress/store.ts`: progress in `localStorage`. `lib/game/rules.ts`: XP, ranks, streaks, badges, leaderboard.
