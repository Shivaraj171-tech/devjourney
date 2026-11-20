# DevJourney: Orbit Orders HQ (working name)

**Learn to code with an AI teammate, and learn to catch its mistakes.**

More and more code is written by AI. The people who thrive will be the ones who can read it, run it, debug it and decide what ships: the human in the loop. DevJourney teaches exactly that, starting from zero.

You join **Orbit Orders**, a small (fictional) food-delivery startup, as a junior developer. Your teammate **Byte** is an AI that writes code fast but not always right. You grow **one real codebase** by closing short tickets (10–20 minutes): bugs, features, code-reading tasks, reviews of AI-written pull requests, and production incidents.

No accounts, no setup: Python runs in your browser (Pyodide), and progress is saved in your browser.

## What's in it

- **Startup HQ**: the home screen. Each season is a floor of the office and each ticket is a room that unlocks once the previous one is done. A phone mock-up of the Orbit Orders app lights up features as you ship them.
- **Ticket workspace**: a story from a teammate, a 2-minute concept lesson (📘 Learn), a VS Code-style editor (Monaco), "Run tests" as CI checks with plain-language error explanations and a 📍 file/line pointer, a "Done when" checklist, staged hints (each costs a little XP), and a short quiz after merging.
- **Ticket types**: `bug`, `feature`, `read` (answer questions about unfamiliar code), `review` (click the lines with problems in a teammate's or AI's pull request; false alarms cost XP) and `incident` (production is down: logs, a countdown and a speed bonus).
- **Byte, the AI teammate** (learn to code with an AI, and learn to catch its mistakes): on some tickets **🤖 Byte suggests** a change as a small diff. *Accept* applies it to your code, *Reject* leaves it out, *Edit it myself* applies it for you to fix. Some suggestions are right, some are subtly wrong, and you only find out by checking (accept a wrong one and the next test run shows you the lesson). On others, the **💬 Ask Byte** tab lets you pick the prompt you'd send and shows what Byte writes back for each. A **🤖 Human-in-the-loop score** on the HQ and leaderboard tracks bugs caught, suggestions trusted correctly, bugs waved through and best prompts picked (+20 XP per catch, +10 per verified good suggestion or best prompt, never a penalty), with two badges (Bug Catcher, Prompt Pro).
- **Game layer**: XP, ranks (Intern → Trusted Intern → Junior Developer, the promotion lands at the end of Month One), a forgiving daily streak (one missed day is bridged), 11 badges, a daily 2-minute warm-up, a skill tree of everything you've learned, and an office leaderboard against fictional teammates (including Sam, the rival new hire, and Byte, the AI assistant).
- **Fun layer** ([`docs/research/fun-roadmap.md`](docs/research/fun-roadmap.md)): the merge modal counts your XP up, fills the rank bar and celebrates promotions and "flow" combos (clean merges in a row); **#orbit-team**, a chat on the HQ where teammates and Byte react to what you just shipped; rooms merged or unlocked since your last visit animate once; and at the end of each floor Maya writes your **performance review** (`/review/<season>/`). All motion respects `prefers-reduced-motion`.
- **Content** (`content/`, format in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) section 4, every format checked by `scripts/validate_content.py`):

  | Floor | Season | Tickets | Concepts |
  |---|---|---|---|
  | 1 | Your First Week | 10 | strings, numbers, conditionals, loops, lists, dictionaries, reading code, None, functions, mutable shared data |
  | 2 | Week Two: The AI Pair | 5 | code review, side effects, tracebacks, boolean logic, reviewing diffs |
  | 3 | Month One: Going Live | 6 | classes, JSON, writing tests, security, performance, refactoring |
  | 4 | Month Two: Working with Byte | 5 | verifying AI claims, testing AI code first, hallucinated APIs, regressions, giving AI context |

  Plus 45 daily warm-ups (`content/warmups/`).
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
- `lib/progress/store.ts`: progress in `localStorage`. `lib/game/rules.ts`: XP, ranks, streaks, badges, leaderboard.
