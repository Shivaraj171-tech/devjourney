# DevJourney (working name)

A learn-to-code platform where you join a fictional startup (**Orbit Orders**, a small food-ordering app) as a junior developer and grow through one evolving codebase by solving tickets: bugs, features, incidents, code reviews and code-reading tasks.

See [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) for the full vision, scope, content format and milestones.

## Status

Milestone 1 is done: Season 1 tickets t01–t03 plus the content validator. Next up is Milestone 2, the in-browser Pyodide runner.
Tech stack is **not locked in yet**. The suggested stack is Next.js + TypeScript + Tailwind, Monaco and Pyodide, and it still needs confirmation.

## Try it (Milestone 1)

Requires Python 3 and PyYAML (`pip install pyyaml`).

Validate all content (every starter must fail its tests, every solution must pass):

```bash
python3 scripts/validate_content.py
```

Run the tests for the runner and the validator:

```bash
python3 -m unittest discover -s scripts/tests -v
```

Solve a ticket yourself: copy a ticket's `starter/` somewhere, edit it, then run its tests against your copy:

```bash
python3 lib/runner/test_runner.py path/to/your/copy content/seasons/s01-first-week/tickets/t01-welcome/tests
```

## Layout

- `content/` — seasons and tickets (format in `docs/PROJECT_BRIEF.md`, section 4)
- `lib/runner/test_runner.py` — stdlib-only test runner. Ticket tests are plain `test_*` functions using `assert`, so pytest is not needed. The plan is to reuse this file in Pyodide later.
- `scripts/validate_content.py` — content validator
