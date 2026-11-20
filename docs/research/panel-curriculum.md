# Expert panel: curriculum and learning-science review

**Seat:** CS-education / learning science. **Scope:** all 26 tickets and 45 warm-ups. Every warm-up was executed, and code-dependent MCQ keys were re-run against starter code with `python3`: all keys are correct.

## 1. Headline findings

1. **The core bet is right.** Reading and tracing before writing is what CS-ed research recommends for novices (Lister et al. 2004; Lopez et al. 2008; Xie et al. 2019). The validator checks every Byte suggestion for honesty by running the tests. The team-test mutation CI (`s03-t03`, `s04-t02/tests/test_team_tests.py`) is an excellent "write a test that can fail" format.
2. **Formats are narrow, and verification is never forced before evidence.** A Byte suggestion can be accepted and judged by the next test run, so the learner never has to *commit to a judgement and a reason* first, which is the skill the pitch promises.
3. **The MCQs are gameable.** Across 77 ticket questions, the correct choice is the longest in **63 (82%)** and is index 1 in **48 (62%)**. Prompt cards repeat this (the "good" prompt is always the longest; `best: 2` in 7 of 10). Many distractors are absurd rather than misconceptions ("Python has no clock", `s03-t05` Q3; "JSON files expire at midnight", `s03-t02` Q3). About 21 questions are "Byte suggests X: what's the quickest check?" with a "Trust it" foil: they test attitude, and the lesson's **AI check** line gives the answer away.
4. **Byte's base rate teaches the wrong heuristic.** 11 of 17 suggestions are wrong (7 of 9 in S1). A learner can score well with "always reject Byte", which is the opposite of calibrated trust. The `>`/`>=` boundary bug appears in about 13 items (six tickets, seven warm-ups): good spacing, but it over-represents one failure mode.
5. **Coverage stops short of what AI code contains** (section 2). `try/except` appears only as Byte's *wrong* fix (`s02-t03/byte.yaml`); `while`, comprehensions, files, sorting, docs, packages and git are absent.
6. **"One new concept" is still broken late in the game.** `s04-t04` needs slicing (`customer[:1].upper() + customer[1:]`, hints.md:3), taught nowhere except one line in `s03-t04/concept.md`. `s04-t05` needs tuple unpacking, `"\n".join` and truthiness, none taught; its hint 3 is the full 11-line solution. (The playtest's S1 fixes have landed.)
7. **Retrieval practice exists but isn't spaced.** Warm-ups are good predict-the-output items (all 45 verified correct), but `pickWarmup` (`lib/game/rules.ts:176`) picks one per day, at random among unlocked concepts, preferring unseen ones. No expanding intervals or error weighting. Tickets are blocked by concept (each bug matches the lesson beside it), so learners rarely practise *diagnosing which kind* of bug they face; `s02-t05` is the one interleaved exception, and it works.
8. **No summative assessment.** Nothing shows a learner can debug unseen AI code without hints, lessons and a concept tag; Maya's review is narrative, not measurement.

## 2. Concept map: covered vs missing

| Area | Covered (where) | Thin | Missing |
|---|---|---|---|
| Values & ops | strings/f-strings (s01-t01), int/float, `/` `//` (t02, t07), cents | str vs int (w006 only) | `%`, `round()` pitfalls, type conversion as a topic |
| Control flow | `if`/`else` (t03, t08), `and/or/not`, short-circuit (s02-t04), `for` + `range` (t04) | `elif` (w008) | `while`, `break/continue`, nested loops as a topic |
| Data | lists, `.append` (t05), dicts, `in`, `.get` (t06), sets (s03-t05), JSON (s03-t02) | `.items()` unpacking (one line, s03-t02) | slicing, string methods, tuples, **nested data** (list of dicts), sorting with `key`, comprehensions (AI writes them constantly; seen only in Byte's responses and test files) |
| Functions | def/return (t01, t09), defaults, imports (t09), side effects, aliasing (t10, s02-t02) | return vs print (w018; s03-t01 prompt card) | scope as a topic, `*args/**kwargs` (reading level) |
| Errors | tracebacks (s02-t03), KeyError, AttributeError, ZeroDivisionError | NameError (s03-t01 lesson) | **`try/except` used correctly**, `raise`, IndexError/TypeError/ValueError drills, error→cause catalogue |
| Program shape | classes (s03-t01), modules, refactoring (s03-t06) | 22-file codebase navigation | files (`open`/`with`), reading stdlib docs, `help()`/`dir()` |
| Testing | assert tests, edges, mutation CI (s03-t03, s04-t02), regressions (s04-t04) | test from spec | tests that test nothing, AI **editing tests to pass** |
| AI verification | claims vs code (s04-t01), hallucinated *local* names (s04-t03), prompt context (10 cards), swallowed errors, hard-coded expected value (s03-t01) | stdlib hallucination (w043) | hallucinated packages/params, scope creep and over-engineering, wrong explanation of an error, calibration of trust |
| Tools | debugger (`lib/runner/tracer.py`), print output under checks | | git/diffs as version control, running code outside tests (scratch console) |

## 3. Difficulty and cognitive load

S1 is now a smooth on-ramp. Remaining spikes: `s03-t01` (six class ideas at once), `s04-t01` Q2 (a trace across four files: `late_refund` → `order_total` → `Order.subtotal` → helpers), and `s04-t05` (three untaught syntax items). `s01-t04` teaches `range(len(...))` before the easier `for price in prices`. Hint 3 is always the verbatim answer, so stuck learners copy instead of generating.

## 4. Is the "one evolving codebase" helping?

**On balance, yes, at a growing cost.** It gives authentic context, motivation and the game's best moments (the `>` bug resurfacing; `items=None` reused in `Order.__init__`), and reading code in context is the target skill. Costs: **extraneous load** (starters grow from 1 to 22 files, all shown as tabs, `components/TicketWorkspace.tsx:54`); **narrow transfer** (nearly every bug is money arithmetic or a threshold); **authoring rigidity** (validator check 7 makes inserting missing concepts mid-chain expensive, so gaps will stay). Keep the spine. Add **off-chain side quests** (a `chain: false` flag, or a sandbox module that isn't carried forward), and a **focus view** that shows only editable files and their direct imports.

## 5. Top 12 recommendations (ranked by learning impact)

| # | Recommendation | Effort | Needs |
|---|---|---|---|
| 1 | **Commit-before-evidence.** Before applying Byte's diff or running tests, the learner picks *Accept/Reject* plus the input that exposes the bug; score the judgement. Add PRIMM "predict the output" before the first run (Sentance, Waite & Kallia 2019). | M | UI |
| 2 | **"Break Byte's code" counterexample format** (spec 6.1): the purest AI-verification skill, checked by running in Pyodide. | M | UI + content |
| 3 | **Capstone and diagnostic.** A no-lesson, no-concept-tag, limited-hint capstone on an *unseen* module, plus short pre/post skill checks from parallel item banks (section 7). | M | content + small UI |
| 4 | **Fill the coverage gaps** in section 2, prioritising: traceback catalogue, correct `try/except`, slicing and string methods, nested data plus tuple unpacking, reading comprehensions, files, `while`, `help`/`dir`/docs. | L | content |
| 5 | **Repair MCQs.** Shuffle choices, length-balance options, use misconception foils, and replace "quickest check?" items with "which test catches it" items (w035/w042 style). | S–M | content + S UI |
| 6 | **Hint 3 becomes a Parsons puzzle** (spec 6.3), with Byte's wrong line as a distractor, instead of the verbatim answer. Parsons problems cut time-on-task without hurting learning (Parsons & Haden 2006; Ericson et al. 2017). | M | UI |
| 7 | **Real spacing and interleaving.** Warm-ups on expanding intervals, weighted to misses, 3 per session (Roediger & Karpicke 2006; Cepeda et al. 2006; Rohrer & Taylor 2007); "mystery bug" tickets with no lesson or concept tag. | S logic + M content | UI (S) |
| 8 | **Calibrate Byte.** Aim for roughly 55–65% correct suggestions, ask for a 1–3 confidence rating on each decision, and report calibration in the Human-in-the-loop score. Diversify beyond `>`/`>=`. | S–M | content + S UI |
| 9 | **Trace tables** driven by the existing `tracer.py`: the learner fills variable values per step, auto-compared with recorded steps. This builds a notional machine (du Boulay 1986). | M | UI |
| 10 | **New AI failure-mode tickets:** Byte edits the *test* to go green; Byte adds a non-existent package or parameter; Byte explains a traceback wrongly; Byte over-engineers (scope creep); a test that asserts nothing. | M | content |
| 11 | **Enforce one new concept** in `s04-t04` and `s04-t05`; fade worked examples (Renkl & Atkinson 2003) instead of full-solution hints; teach `for x in list` before `range(len())`. | S | content |
| 12 | **Focus view plus off-chain side quests** (section 4), so the codebase spine stays but the gaps can be filled. | S–M | UI + validator |

## 6. Three new-format tasks, fully specified

### 6.1 "Break Byte's code" (counterexample)
Byte: *"`split_bill` splits a bill fairly. Tested it on $9.00 for 3, works!"*
```python
def split_bill(total_cents, people):
    """Spec: return `people` shares that add up EXACTLY to total_cents;
    no two shares differ by more than 1 cent."""
    share = total_cents // people
    return [share] * people
```
**Learner action:** type `total_cents` and `people` that make Byte's code break the spec, then one sentence on why (shown, not graded).
**Auto-check (Pyodide):** content ships a spec predicate, not a solution:
```python
def spec_ok(total_cents, people, shares):
    return len(shares) == people and sum(shares) == total_cents and max(shares) - min(shares) <= 1
```
The learner passes if `spec_ok(...)` is False on Byte's output. Verified: `(900, 3)` → `[300, 300, 300]` passes the spec, so it is not a counterexample; `(1000, 3)` → `[333, 333, 333]` sums to 999, so it is caught. Miss feedback: "Right for that input. What total can't be split evenly?" Suggested format: `counterexample.yaml` with `code`, `spec_predicate`, `inputs` (names and types), `hint`.

### 6.2 "Which of Byte's three answers is right?"
Spec: `first_name(full)` returns the first word, ignores extra spaces, and returns `""` for a blank name.
```python
# A                          # B                             # C
return full.split()[0]       return full.split(" ")[0]       parts = full.split()
                                                             return parts[0] if parts else ""
```
**Learner action:** pick the correct version, then, for each version they rejected, enter an input that proves it wrong.
**Auto-check:** C is the reference, and it is visible anyway, so no hidden solution ships to the browser. An input breaks X if X raises or `X(inp) != C(inp)`. Verified: `""` makes A raise `IndexError`; `"  Ana Lucia"` makes B return `''`; `"Ana Lucia"` breaks neither, and the learner is told so. Picking C without counterexamples earns partial credit only.

### 6.3 Parsons with Byte distractors (replaces a verbatim hint 3)
Goal: `late_orders(deliveries)` returns the ids of orders that took **more than** 45 minutes, in order. Scrambled lines (learner drags *and* sets indentation; two lines are traps):
```text
def late_orders(deliveries):
late = []
for order_id, minutes in deliveries:
if minutes > 45:
if minutes >= 45:            # distractor (Byte's boundary slip)
late.append(order_id)
late = late.append(order_id)  # distractor (append returns None)
return late
```
**Auto-check:** join the placed lines with the chosen indents, `compile()` them, then run the ticket's existing tests in the worker (verified: `[(1001, 50), (1002, 45), (1003, 46)]` gives `[1001, 1003]`, and `[]` gives `[]`). Using a distractor triggers its `explain` text. Format: `parsons.yaml` with `lines`, `distractors` (`line`, `explain`) and reuse of `tests/`.

## 7. Proposed roadmap: zero to confidently debugging AI code

| Season | Theme | Adds (beyond today) | Signature formats |
|---|---|---|---|
| 1 First Week | values, `if/elif/else`, lists, `for`, dicts, None, functions | `elif`, for-each first, return vs print | predict-then-run, trace tables, fill-in-blank (`____` is a legal name, so content only) |
| 2 Reading & Running | tracebacks, error catalogue, print and debugger, string methods, slicing, `while`, side effects, aliasing (move t10 here), review basics | correct `try/except` | traceback "click the line to fix" (reuse the review UI), counterexamples |
| 3 Data Shapes | nested data, tuples and unpacking, reading comprehensions, `sorted(key=)`, JSON, files | new, off-chain side quests | Parsons, spot-the-difference |
| 4 Going Live | classes, tests and mutation CI, security, performance, refactoring, modules, reading docs (`help`/`dir`), git diffs and revert | docs and git | write-a-test, review |
| 5 Working with Byte | claims, test-first, hallucinated names *and packages/params*, regressions, specs, Byte edits the tests, scope creep, calibration | new AI failure modes | which-of-3, commit-before-evidence, prompt cards |
| 6 Byte's Week Alone (capstone) | unseen module in a new domain (rider scheduling); 5 seeded bugs of mixed types; no lessons, concept tags hidden, max 1 hint | assessment | flag lines → write killing tests → fix → choose the correct Byte explanation; compare with the pre-test |

**How we would know it worked:** a 12-item diagnostic at onboarding and before the capstone (parallel forms: predict output, find a counterexample, flag a line, pick the catching test), no-hint capstone score, and Byte-decision calibration (confidence vs correctness). Clearing the capstone at 80%+ with calibrated confidence is a credible "can catch AI's mistakes".
