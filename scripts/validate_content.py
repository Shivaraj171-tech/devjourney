"""Validate every season and ticket under content/.

For each ticket it checks:
  1. Required files exist (ticket.yaml, story.md, hints.md, starter/, tests/, solution/).
  2. ticket.yaml has the required fields with allowed values, and every
     file in files_editable exists in starter/.
  3. hints.md has at least one hint (hints are separated by a line "---").
  4. questions.yaml (optional "check your understanding" quiz) is well formed:
     2-4 choices per question, answer is a valid 0-based index, explain present.
  4b. concept.md (optional "Learn" lesson) is non-empty, starts with a
     **Title** line, every ```python block is valid Python syntax, and its
     prose (outside ``` blocks) is at most 230 words: a 2-minute lesson.
     A season may set `lesson: long` (see below) for deep lessons.
  5. The tests FAIL against starter/ (otherwise there is nothing to do).
  6. The tests PASS against solution/.
  7. Evolving codebase: every file in solution(N) appears unchanged in starter(N+1).
     This also spans season boundaries, in order: the first ticket of a season
     continues from the last ticket of the season before it.
  8. Nothing gives the answer away (tickets with tests and hints): no hint may contain,
     verbatim, a line the solution adds (comments, docstrings, lines under 9 characters
     and lines already in starter/ don't count): the last hint is a near-answer, the
     direction and the exact spot. And no starter line that the solution changes may
     carry a comment naming Byte: the story describes the symptom instead.

Daily warm-ups (content/warmups/*.yaml, optional) are checked too: required
fields, unique ids, `after` names a real ticket id, the code compiles and is
3-10 lines, 2-4 choices and a valid 0-based answer index.

Tickets with `type: read` are different: the questions ARE the task. They need
starter/ (the code to read) and a questions.yaml with at least 3 questions;
tests/ and solution/ are optional and checks 5-6 are skipped. For check 7 the
code is unchanged by a read ticket, so its starter/ counts as its solution.

Tickets with `type: review` ask the learner to review a pull request. They need
starter/ (the codebase before the PR), pr/ (the PR's changed files, as full file
text after the change) and review.yaml:

    title: "Add rider tips"           # PR title
    author: "Byte 🤖"
    description: |                     # the PR description (Markdown)
      ...
    files: [app/tips.py]               # every file in pr/, in display order
    issues:                            # the real problems (at least 1)
      - file: app/tips.py
        line: 17                       # 1-based line in pr/app/tips.py
        also_lines: [16]               # optional: nearby lines that also count
        explain: "..."
    merged: true                       # optional (default false): the PR is merged
                                       # as-is, so the next ticket's code includes it

tests/ and solution/ are optional and checks 5-6 are skipped. For check 7 the
review ticket's result is its starter/, plus pr/ on top when `merged: true`.

Tickets with `type: incident` work like bug tickets (starter fails, solution
passes) and also need logs.txt (the production logs shown in the Logs panel).
ticket.yaml may set `time_limit_minutes` (1-60, default 15) for the speed bonus.

Any ticket may also have byte.yaml: Byte, the office AI assistant, either
suggests a change to the code (accept / reject / edit) or answers a prompt the
learner picks. Both blocks are optional, but at least one must be present:

    suggestion:                        # only on tickets with tests
      file: app/cart.py                # one of files_editable
      find: "    for i in range(len(prices) - 1):"   # exact text, exactly once in starter/<file>
      replace: "    for i in range(1, len(prices)):" # Byte's proposed code
      correct: false                   # true: starter + replacement PASSES the tests,
                                       # false: it still FAILS them (checked by running)
      partial: true                    # optional, only with correct: true: Byte's change is right
                                       # as far as it goes but leaves work for the learner. It must
                                       # keep every test that passes on starter/ passing, make at
                                       # least one more test pass, and NOT make all tests pass
      says: "Off-by-one spotted! ..."  # Byte's one-line pitch
      explain: "..."                   # why it's right or wrong (shown after the decision)
      why:                             # optional: "decide before evidence". The learner must pick
        choices: ["...", "...", "..."] # Accept/Reject AND the reason (exactly 3 choices) before
        answer: 0                      # Byte's code is applied; XP only for decision + reason right
                                       # (across ALL suggestions, the right reason may be the strictly
                                       # longest choice in at most a quarter of them: report "byte/why-lengths")
    prompt:
      goal: "..."                      # what the learner wants Byte to do
      options:                         # 2-4 prompts the learner can pick from
        - prompt: "..."
          response_code: |             # what Byte writes for that prompt (valid Python)
            ...
          verdict: good                # good | vague | wrong
          feedback: "..."
      best: 2                          # 0-based index of the only "good" option

The suggestion is checked for honesty: the replacement is applied to a copy of
starter/ and the ticket's tests are run on it, so a "correct" suggestion really
passes and a wrong one really fails.

Any ticket may also have formats.yaml: extra short task formats shown with the
ticket. Each section is optional (at least one is needed) and is a list:

    predict:                           # "Predict the output", then run it
      - code: |                        # 1-12 lines, runs without error
          print(1000 // 3)
        question: "What does this print?"
        answer: "333"                  # EXACTLY what the code prints (checked by running it)
        choices: ["333", "333.33"]     # optional: 2-4 choices, one equal to answer
        explain: "..."
    break_it:                          # "Break Byte's code": find an input that breaks the spec
      - says: "Tested it on 900, 3. Works!"   # Byte's pitch
        code: |                        # Byte's (buggy) function
          def split_bill(total_cents, people): ...
        spec: "..."                    # the spec, in plain English
        call: "split_bill({input})"    # {input} is what the learner types (Python literals)
        input_hint: "total_cents, people"
        helpers: |                     # optional: code the check uses (e.g. a spec predicate)
          def spec_ok(total_cents, people, shares): ...
        check: "spec_ok({input}, result)"   # True when Byte's `result` meets the spec
        crash_counts: false            # optional: does a crash in Byte's code count as breaking it?
        normal_input: "900, 3"         # must meet the spec (Byte's own test)
        example_input: "1000, 3"       # must break it (never sent to the browser)
        miss: "..."                    # optional nudge after an input that doesn't break it
        explain: "..."                 # shown once the learner breaks it
    parsons:                           # "Put the lines in order"
      - goal: "..."
        lines: ["def f(x):", "    return x"]   # the correct program, in order, with indentation
        distractors:                   # 1+ wrong lines mixed in (e.g. Byte's slip)
          - line: "    return x + 1"
            replaces: 1                # 0-based index into lines (never sent to the browser)
            explain: "..."             # shown if the learner uses it
        check: |                       # asserts run after the learner's program
          assert f(2) == 2
        expected_output: "..."         # optional: what the program + check must print
        explain: "..."                 # optional: shown once solved
    trace:                             # "Trace table": fill in each variable, step by step
      - code: |                        # 2-15 lines: a small function AND a call to it
          def total(prices): ...
          result = total([3, 4])
        watch: [t, p]                  # 1-4 variable names to track (the columns)
        rows: 5                        # rows to fill: one per line that gives a watched
                                       # variable a new value (checked by tracing the code)
        explain: "..."                 # shown after the first check

Every item is checked by running it with python3 through lib/runner/formats.py,
the same code the browser runs in Pyodide: a prediction's answer is the real
output, Byte's code meets the spec on normal_input and breaks it on
example_input, the correct Parsons order passes while each distractor
(swapped in for the line it replaces) fails, and a trace table's code runs
cleanly under lib/runner/tracer.py with exactly `rows` rows, every watched
variable gets a value and every value is short enough to type. The real
values are never stored: the browser traces the code itself on "Check".

season.yaml may set two optional flags:

    chain: false     # off-chain: an unseen module, not part of the evolving codebase.
                     # Check 7 is skipped inside the season and across its borders
                     # (the next on-chain season continues from the last on-chain one).
    final: true      # the final exam (needs chain: false and must come after every
                     # on-chain season). Its tickets are an exam: no hints.md,
                     # concept.md, byte.yaml, formats.yaml or questions.yaml allowed.

An off-chain season WITHOUT `final` is a side quest (e.g. s50-bug-bounty, the
Bug Bounty board): it never gates anything and none of its tickets gate each
other. Its tickets are "mystery bugs": no concept.md, and ticket.yaml has

    bug_kind: off-by-one   # optional, revealed once solved ("This was an off-by-one
                           # bug"; default: the new_concept); the title and story.md
                           # must not contain it
    requires: s01-t04      # optional: opens once that ticket is solved. It must be an
                           # on-chain ticket with a concept.md and the same new_concept
                           # (the reveal links to its lesson)

estimated_minutes is at most 10. `requires` and `bug_kind` are not allowed elsewhere.

A side quest whose season.yaml sets `requires` is a SIDE FLOOR (e.g. s40-robotics-lab,
the Robotics Lab), opened as a whole once that ticket is solved:

    chain: false
    requires: s01-t10    # an on-chain ticket id: the whole floor opens once it is solved.
                         # Or a ticket of ANOTHER side floor (modules in sequence, e.g.
                         # s42-manipulators-m2 has `requires: s41-t11`): it must exist,
                         # not be the floor's own, and the floors' requires must not loop
    icon: "🤖"           # optional: the floor's icon on the HQ
    short_title: "Manipulators · M1"   # optional: the floor's name on the HQ board and ticket chip

A side floor may also set

    lesson: long     # deep lessons (e.g. s41-manipulators-m1): every concept.md may have
                     # up to 700 words of prose (code blocks not counted, at most 90 code
                     # lines) and must have at least 5 sections, each under its own
                     # **heading** line (a line that is all bold): the picture, the maths,
                     # a worked example, the trap, and how to check an AI's version. The
                     # headings say what the section is about ("**Rows instead of columns**"),
                     # not what kind of section it is. The worked example (a python block
                     # ending in "# Output:") comes after the first two sections and before
                     # the last; the last section must mention AI or Byte.
                     # Every ```python block must RUN cleanly (python3 -I, standard library
                     # only), and at least one must end with an "# Output:" comment block:
                     #     print(round(math.cos(0.5), 3))
                     #     # Output:
                     #     # 0.878
                     # whose lines must be exactly what the block prints (a verified example).

Its tickets are ordinary lesson tickets that open one after another: each needs a
concept.md, `requires`/`bug_kind`/`tutorial` are not allowed, and there is no
10-minute cap. The floor is a separate codebase: the evolving-codebase check runs
INSIDE it (ticket to ticket, from its first ticket) but never across its borders.
It never gates anything (the final exam stays gated on the last on-chain season).

ticket.yaml may also set

    tutorial: true   # optional: Byte's suggestion here is a practice round (the first
                     # tickets). The decision is not counted in the human-in-the-loop
                     # score. Needs a byte.yaml suggestion; not allowed in the final
                     # exam or a side quest.

The skills check (content/assessment/skills-check.yaml, optional) is checked too:

    title: "Skills check"
    intro: "..."
    items:                             # exactly 12, unique ids, every kind used
      - id: predict-big-prices
        kind: predict                  # predict | catch_input | spot_line | pick_answer
        prompt: "What does this print?"
        code: |                        # predict: runs cleanly; its output is choices[answer]
          print(450)
        choices: ["450", "750"]        # 2-4, all different
        answer: 0                      # 0-based
        explain: "..."
      - kind: catch_input              # "which test input catches Byte's bug?"
        code: "def f(x): ..."          # Byte's buggy function
        reference: "def f(x): ..."     # the correct one (same name; never sent to the browser)
        call: "f({input})"             # each choice is a Python literal for {input}
        # check: ONLY choices[answer] makes Byte's code and the reference disagree
        #        (a different result, or one of them raises)
      - kind: spot_line                # "which line has the bug?"
        code: "..."                    # Byte's snippet; each choice is one of its lines (stripped)
        fix: "late += 1"               # the fixed line (never sent to the browser)
        check: "assert ..."            # fails on code, passes once choices[answer] -> fix
      - kind: pick_answer              # "which of Byte's 3 answers is right?"
        choices: ["def f(): ...", ...] # 3 code answers; ONLY choices[answer] passes `check`
        check: "assert ..."

Choices are balanced: across the whole check, the right answer may be the
strictly longest choice in at most a quarter of the items (so "pick the
longest" is no strategy).

Writing ("slop check", house style in docs/writing/style-guide.md): every prose file
(story, lesson, hints, quiz, Byte, practice formats, PR descriptions, season intros,
warm-ups, skills check) and the chat lines in lib/game/teamChat.ts. Code (fences,
inline code, YAML code fields), maths and quoted strings are skipped, and so are files
under 30 words. A file fails ("slop/check") on any em or en dash, a banned phrase,
more than 12 "!" or 15 emoji per 1,000 words (2 or more of them), or 2 or more
"not X, but Y" rebuttals. Warnings never fail: a mid-sentence colon rate over 30 per
1,000 words, any emoji, the same 7-word run in 3 or more files, the same long-lesson
heading in more than 3 lessons. `--slop-warnings` lists every warning.

Usage:
    python3 scripts/validate_content.py [content_dir] [--slop-warnings]

Exits with code 0 if everything is valid, 1 otherwise.
Requires PyYAML.
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "lib" / "runner" / "test_runner.py"
FORMATS_RUNNER = REPO_ROOT / "lib" / "runner" / "formats.py"
TEST_TIMEOUT_SECONDS = 10
MIN_CHOICES, MAX_CHOICES = 2, 4
MIN_READ_QUESTIONS = 3
MAX_INCIDENT_MINUTES = 60
MIN_PROMPT_OPTIONS, MAX_PROMPT_OPTIONS = 2, 4
BYTE_VERDICTS = {"good", "vague", "wrong"}
WHY_CHOICES = 3
FORMAT_SECTIONS = ("predict", "break_it", "parsons", "trace")
MAX_PREDICT_LINES = 12
MAX_TRACE_LINES = 15
MAX_TRACE_WATCH = 4
MAX_TRACE_ROWS = 12
MAX_TRACE_VALUE = 30
MIN_PARSONS_LINES = 3
# Ticket types without tests to run: the quiz (read) or the review (review) is the task.
NO_TEST_TYPES = {"read", "review"}

REQUIRED_FIELDS = {
    "id": str,
    "title": str,
    "type": str,
    "level": str,
    "track": str,
    "concepts": list,
    "new_concept": str,
    "estimated_minutes": int,
    "tests_visible": bool,
    "files_editable": list,
}
ALLOWED = {
    "type": {"bug", "feature", "incident", "review", "read"},
    "level": {"intern", "junior", "mid", "senior"},
    "track": {"foundations", "building", "debugging", "reading", "systems", "ai", "robotics"},
}


WARMUP_CONCEPTS = {
    "strings", "numbers", "conditionals", "loops", "lists", "dictionaries",
    "None", "functions", "mutable-shared-data", "reading-code",
    # Season 2
    "code-review", "side-effects", "tracebacks", "boolean-logic", "reviewing-diffs",
    # Season 3
    "classes", "json", "writing-tests", "security", "performance", "refactoring",
    # Season 4
    "verifying-ai-claims", "test-first-verification", "hallucinated-apis", "regressions", "specs-and-context",
    # Season 5
    "try-except", "while-loops", "string-methods", "nested-data", "tuples-and-sorting", "scope-creep",
}
WARMUP_STRING_FIELDS = ["id", "title", "concept", "after", "code", "question", "explain"]
MIN_WARMUP_LINES, MAX_WARMUP_LINES = 3, 10


def run_ticket_tests(code_dir, tests_dir):
    """Run tests in a fresh Python process so imports never leak between runs.

    Returns the runner's result dict, or an "error" result on timeout/crash.
    """
    try:
        proc = subprocess.run(
            [sys.executable, str(RUNNER), str(code_dir), str(tests_dir)],
            capture_output=True, text=True, timeout=TEST_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {"passed": False, "error": f"timed out after {TEST_TIMEOUT_SECONDS}s"}
    if proc.returncode != 0:
        return {"passed": False, "error": f"runner crashed: {proc.stderr.strip()}"}
    return json.loads(proc.stdout)


def read_hints(path):
    """Split hints.md into a list of non-empty hints (separator: a line '---')."""
    hints, current = [], []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip() == "---":
            hints.append("\n".join(current).strip())
            current = []
        else:
            current.append(line)
    hints.append("\n".join(current).strip())
    return [h for h in hints if h]


def load_ticket_type(ticket_dir):
    """Return the ticket's `type` from ticket.yaml, or None if it can't be read."""
    try:
        meta = yaml.safe_load((ticket_dir / "ticket.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return None
    return meta.get("type") if isinstance(meta, dict) else None


def is_nonempty_str(value):
    return isinstance(value, str) and value.strip() != ""


def check_questions(path, min_questions=1):
    """Check a questions.yaml file. Returns a list of error strings.

    Format:
        questions:
          - prompt: "..."
            choices: ["...", "..."]   # 2-4 choices
            answer: 1                 # 0-based index into choices
            explain: "..."
    """
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"questions.yaml is not valid YAML: {exc}"]
    if not isinstance(data, dict) or not isinstance(data.get("questions"), list):
        return ["questions.yaml must have a 'questions' list"]

    questions = data["questions"]
    errors = []
    if len(questions) < min_questions:
        errors.append(f"questions.yaml needs at least {min_questions} question(s), has {len(questions)}")
    for i, q in enumerate(questions, start=1):
        where = f"questions.yaml: question {i}"
        if not isinstance(q, dict):
            errors.append(f"{where} must be a mapping")
            continue
        for field in ["prompt", "explain"]:
            if not is_nonempty_str(q.get(field)):
                errors.append(f"{where}: '{field}' is missing or empty")
        choices = q.get("choices")
        if not isinstance(choices, list) or not all(is_nonempty_str(c) for c in choices):
            errors.append(f"{where}: 'choices' must be a list of non-empty strings")
            continue
        if not MIN_CHOICES <= len(choices) <= MAX_CHOICES:
            errors.append(f"{where}: has {len(choices)} choices, needs {MIN_CHOICES}-{MAX_CHOICES}")
        if len({c.strip() for c in choices}) != len(choices):
            errors.append(f"{where}: choices must all be different")
        answer = q.get("answer")
        if not isinstance(answer, int) or isinstance(answer, bool):
            errors.append(f"{where}: 'answer' must be a whole number (0-based index)")
        elif not 0 <= answer < len(choices):
            errors.append(f"{where}: answer {answer} is out of range for {len(choices)} choices")
    return errors


PYTHON_BLOCK = re.compile(r"^```python[ \t]*\n(.*?)^```[ \t]*$", re.MULTILINE | re.DOTALL)
ANY_BLOCK = re.compile(r"^```[^\n]*\n(.*?)^```[ \t]*$", re.MULTILINE | re.DOTALL)
TITLE_LINE = re.compile(r"^\*\*[^*].*\*\*$")
MAX_SHORT_TITLE_CHARS = 40
MAX_LESSON_WORDS = 230  # a 2-minute lesson (prose outside ``` blocks)
MAX_LONG_LESSON_WORDS = 700  # season.yaml `lesson: long`
MAX_LONG_LESSON_CODE_LINES = 90
LONG_LESSON_MIN_SECTIONS = 5  # the picture, the maths, a worked example, the trap, the AI check
HEADING_LINE = re.compile(r"^\*\*[^*]+\*\*$")  # a section heading: a line that is all bold
AI_WORD = re.compile(r"\b(AI|AIs|Byte)\b")
LESSON_KINDS = ("short", "long")
OUTPUT_MARK = "# Output:"


def lesson_words(text):
    """Words of prose in a lesson: everything outside ``` blocks."""
    return len(ANY_BLOCK.sub(" ", text).split())


def check_concept(path, long=False):
    """Check a concept.md lesson. Returns a list of error strings.

    long: the season sets `lesson: long` (deep lessons): more words, required sections,
    and every python block is run (its "# Output:" comment, if any, must match).
    """
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        return ["concept.md is empty"]
    errors = []
    first_line = text.strip().splitlines()[0].strip()
    if not TITLE_LINE.match(first_line):
        errors.append(f"concept.md must start with a **Title** line, got {first_line!r}")
    for i, match in enumerate(PYTHON_BLOCK.finditer(text), start=1):
        try:
            compile(match.group(1), f"concept.md block {i}", "exec")
        except SyntaxError as exc:
            errors.append(f"concept.md: python block {i} has a syntax error: {exc.msg} (line {exc.lineno})")
    words = lesson_words(text)
    limit = MAX_LONG_LESSON_WORDS if long else MAX_LESSON_WORDS
    if words > limit:
        hint = "" if long else " (a deep floor can set `lesson: long` in season.yaml)"
        errors.append(f"concept.md has {words} words of prose, at most {limit} allowed{hint}")
    if long and not errors:
        errors += check_long_lesson(text)
    return errors


def lesson_sections(text):
    """(heading, first line index, body) for each section of a lesson: a heading is a line
    that is all bold, outside code blocks; the title (the first line) is not a section."""
    lines = text.splitlines()
    in_code, heads = False, []
    for i, line in enumerate(lines):
        if line.startswith("```"):
            in_code = not in_code
            continue
        if not in_code and i > 0 and HEADING_LINE.match(line.strip()) and lines[0].strip() != line.strip():
            heads.append(i)
    out = []
    for n, i in enumerate(heads):
        stop = heads[n + 1] if n + 1 < len(heads) else len(lines)
        out.append((lines[i].strip()[2:-2], i, "\n".join(lines[i + 1:stop])))
    return out


def check_long_lesson(text):
    """A deep lesson: its sections (picture, maths, worked example, trap, AI check: headings
    free, structure checked) and python blocks that run (worked examples verified)."""
    errors = []
    sections = lesson_sections(text)
    if len(sections) < LONG_LESSON_MIN_SECTIONS:
        errors.append(f"concept.md: a long lesson needs at least {LONG_LESSON_MIN_SECTIONS} sections, each under its "
                      "own **heading** line (the picture, the maths, a worked example, the trap, how to check an "
                      f"AI's version); found {len(sections)}")
    else:
        last_heading, _, last_body = sections[-1]
        if not AI_WORD.search(last_heading + "\n" + last_body):
            errors.append("concept.md: the last section must say how to check an AI's version (mention AI or Byte)")
        example = [m for m in PYTHON_BLOCK.finditer(text) if OUTPUT_MARK in [l.strip() for l in m.group(1).splitlines()]]
        if example:
            line = text.count("\n", 0, example[0].start())
            if not sections[1][1] < line < sections[-1][1]:
                errors.append("concept.md: the worked example (the python block with '# Output:') must come after the "
                              "first two sections (the picture and the maths) and before the last one")
    code_lines = sum(len(m.group(1).splitlines()) for m in ANY_BLOCK.finditer(text))
    if code_lines > MAX_LONG_LESSON_CODE_LINES:
        errors.append(f"concept.md has {code_lines} lines in code blocks, at most {MAX_LONG_LESSON_CODE_LINES}")
    verified = 0
    for i, match in enumerate(PYTHON_BLOCK.finditer(text), start=1):
        code = match.group(1)
        out, error = run_python(code)
        if error:
            errors.append(f"concept.md: python block {i} does not run: {error}")
            continue
        block = code.rstrip("\n").splitlines()
        if OUTPUT_MARK not in [line.strip() for line in block]:
            continue
        start = [line.strip() for line in block].index(OUTPUT_MARK)
        expected = [line.strip()[1:].strip() if line.strip().startswith("#") else line for line in block[start + 1:]]
        if normalize_output(out) != normalize_output("\n".join(expected)):
            errors.append(f"concept.md: python block {i} prints {out.strip()!r}, but its # Output: says {chr(10).join(expected)!r}")
        else:
            verified += 1
    if verified == 0 and not any("does not run" in e or "prints" in e for e in errors):
        errors.append("concept.md: a long lesson needs a worked example: a python block ending in an "
                      "'# Output:' comment with what it prints (checked by running it)")
    return errors


# Files a final-exam ticket must not have: it's an exam (no hints, lesson, Byte or quiz).
EXAM_FORBIDDEN = ["hints.md", "concept.md", "byte.yaml", "formats.yaml", "questions.yaml"]


def check_ticket_meta(ticket_dir, final=False, side_quest=False, side_floor=False, long_lesson=False):
    """Check files, ticket.yaml, hints and questions. Returns a list of error strings.

    final: the ticket belongs to the final exam (season.yaml `final: true`), so it
    has no hints.md and must not have a lesson, Byte content or a quiz.
    side_quest: the ticket belongs to a side-quest season (`chain: false`, not final),
    e.g. the Bug Bounty board: a "mystery bug" with no lesson (see check_side_quest_meta).
    side_floor: the ticket belongs to a side floor (a side quest with a season-level
    `requires`, e.g. the Robotics Lab): a normal lesson ticket, so concept.md is required.
    long_lesson: the season sets `lesson: long`: concept.md is a deep lesson (check_long_lesson).
    """
    errors = []
    if final:
        errors += [f"{name} is not allowed in a final-exam ticket (no help in the exam)"
                   for name in EXAM_FORBIDDEN if (ticket_dir / name).exists()]
    for name in ["ticket.yaml", "story.md"] + ([] if final else ["hints.md"]):
        if not (ticket_dir / name).is_file():
            errors.append(f"missing {name}")
    if errors:
        return errors

    try:
        meta = yaml.safe_load((ticket_dir / "ticket.yaml").read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"ticket.yaml is not valid YAML: {exc}"]
    if not isinstance(meta, dict):
        return ["ticket.yaml must be a mapping of fields"]
    ticket_type = meta.get("type")
    is_read = ticket_type == "read"
    has_tests = ticket_type not in NO_TEST_TYPES

    folders = {"read": ["starter"], "review": ["starter", "pr"]}.get(ticket_type, ["starter", "tests", "solution"])
    for name in folders:
        if not (ticket_dir / name).is_dir():
            errors.append(f"missing {name}/ folder")
    questions_file = ticket_dir / "questions.yaml"
    if is_read and not questions_file.is_file():
        errors.append("missing questions.yaml (required for read tickets)")
    if ticket_type == "review" and not (ticket_dir / "review.yaml").is_file():
        errors.append("missing review.yaml (required for review tickets)")
    if ticket_type == "incident" and not (ticket_dir / "logs.txt").is_file():
        errors.append("missing logs.txt (required for incident tickets)")
    if errors:
        return errors

    for field, kind in REQUIRED_FIELDS.items():
        if field not in meta:
            errors.append(f"ticket.yaml: missing field '{field}'")
        elif not isinstance(meta[field], kind) or (kind is int and isinstance(meta[field], bool)):
            errors.append(f"ticket.yaml: '{field}' should be {kind.__name__}")
    for field, allowed in ALLOWED.items():
        if field in meta and meta[field] not in allowed:
            errors.append(f"ticket.yaml: '{field}' is {meta[field]!r}, allowed: {sorted(allowed)}")
    for rel in meta.get("files_editable") or []:
        if not (ticket_dir / "starter" / rel).is_file():
            errors.append(f"files_editable: {rel} does not exist in starter/")

    if not final and not read_hints(ticket_dir / "hints.md"):
        errors.append("hints.md has no hints")
    if side_quest:
        errors += check_side_quest_meta(ticket_dir, meta)
    else:
        errors += [f"ticket.yaml: '{field}' is only for side-quest tickets (season.yaml `chain: false`, not final)"
                   for field in SIDE_QUEST_FIELDS if field in meta]
    errors += check_tutorial_flag(ticket_dir, meta, final or side_quest or side_floor)
    if side_floor and not (ticket_dir / "concept.md").is_file():
        errors.append("missing concept.md (every side-floor ticket teaches one new concept)")
    if has_tests and not list((ticket_dir / "tests").glob("test_*.py")):
        errors.append("tests/ has no test_*.py files")
    if questions_file.is_file():
        errors += check_questions(questions_file, MIN_READ_QUESTIONS if is_read else 1)
    if (ticket_dir / "concept.md").is_file():
        errors += check_concept(ticket_dir / "concept.md", long=long_lesson)
    if ticket_type == "review":
        errors += check_review(ticket_dir)
    if ticket_type == "incident":
        errors += check_incident(ticket_dir, meta)
    if (ticket_dir / "byte.yaml").is_file():
        errors += check_byte(ticket_dir, meta)
    if (ticket_dir / "formats.yaml").is_file():
        errors += check_formats(ticket_dir)
    if has_tests and not final:
        errors += check_hint_leaks(ticket_dir)
        errors += check_bug_line_labels(ticket_dir)
    return errors


# ---------- what the solution changes: hints and bug lines must not give it away ----------

# Changed lines shorter than this (after stripping) are too generic to count as "the answer"
# (`return 0`, `else:`, `pass`).
MIN_LEAK_LINE = 9


def _norm(text):
    """Code text with backticks dropped and runs of spaces collapsed, for verbatim comparison."""
    return re.sub(r"\s+", " ", text.replace("`", "")).strip()


def solution_changes(ticket_dir):
    """(changed starter lines, added solution lines) across the ticket's .py files.

    Each is a list of (relative path, 1-based line number, line text). A file new in solution/
    counts as all added; __pycache__ is ignored.
    """
    import difflib
    starter, solution = ticket_dir / "starter", ticket_dir / "solution"
    removed, added = [], []
    if not solution.is_dir():
        return removed, added
    for path in sorted(solution.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        rel = path.relative_to(solution)
        before = (starter / rel).read_text(encoding="utf-8").splitlines() if (starter / rel).is_file() else []
        after = path.read_text(encoding="utf-8").splitlines()
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes():
            if tag in ("replace", "delete"):
                removed += [(rel.as_posix(), i + 1, before[i]) for i in range(i1, i2)]
            if tag in ("replace", "insert"):
                added += [(rel.as_posix(), j + 1, after[j]) for j in range(j1, j2)]
    return removed, added


def check_hint_leaks(ticket_dir):
    """No hint may contain a line the solution adds, verbatim: the last hint is a near-answer
    (the direction and the exact spot), never the code itself (PROJECT_BRIEF: hints go
    nudge -> direction -> near-answer). Comment lines, docstring lines, very short lines and
    lines already in starter/ don't count."""
    hints_file = ticket_dir / "hints.md"
    if not hints_file.is_file():
        return []
    _, added = solution_changes(ticket_dir)
    starter_lines = set()
    for path in (ticket_dir / "starter").rglob("*.py"):
        if "__pycache__" not in path.parts:
            starter_lines.update(_norm(line) for line in path.read_text(encoding="utf-8").splitlines())
    answer_lines = []
    for rel, _, line in added:
        code = _norm(line)
        if len(code) < MIN_LEAK_LINE or code.startswith(("#", '"', "'")) or code in starter_lines:
            continue
        answer_lines.append((rel, code))
    errors = []
    for n, hint in enumerate(read_hints(hints_file), start=1):
        flat = _norm(hint)
        for rel, code in answer_lines:
            if code in flat:
                errors.append(f"hints.md hint {n} gives away the solution: it contains the line `{code}` "
                              f"from solution/{rel} verbatim. Point at the exact spot and the idea instead, "
                              f"and leave writing the code to the learner")
                break
    return errors


def check_bug_line_labels(ticket_dir):
    """A starter line that the solution changes must not carry a comment naming Byte: that turns
    "find the bug" into "find the labelled line" (curriculum audit). Say what is observed in
    story.md instead, and keep explanations for the hints."""
    removed, _ = solution_changes(ticket_dir)
    return [f"starter/{rel}:{n} is a line the solution changes, and its comment names Byte "
            f"({line.strip()!r}): don't label the bug line; describe the symptom in story.md"
            for rel, n, line in removed if re.search(r"#.*\bByte\b", line)]


def check_tutorial_flag(ticket_dir, meta, off_story):
    """`tutorial: true`: a practice Byte decision, left out of the human-in-the-loop score."""
    if "tutorial" not in meta:
        return []
    if meta["tutorial"] is not True:
        return ["ticket.yaml: 'tutorial' must be true (or left out)"]
    if off_story:
        return ["ticket.yaml: 'tutorial' is not allowed in the final exam or a side quest"]
    byte_file = ticket_dir / "byte.yaml"
    try:
        byte = yaml.safe_load(byte_file.read_text(encoding="utf-8")) if byte_file.is_file() else None
    except yaml.YAMLError:
        byte = None  # reported by check_byte
    if not isinstance(byte, dict) or "suggestion" not in byte:
        return ["ticket.yaml: 'tutorial' needs a byte.yaml suggestion (it only changes how Byte's decision is scored)"]
    return []


SIDE_QUEST_FIELDS = ("requires", "bug_kind")
MAX_SIDE_QUEST_MINUTES = 10


def check_side_quest_meta(ticket_dir, meta):
    """A side-quest ("mystery bug") ticket: short, no concept named in its title or story.

    ticket.yaml may set `bug_kind` (revealed after solving: "This was an off-by-one bug";
    without it the reveal names the ticket's new_concept) and `requires: <ticket id>`
    (checked against every season in check_requires).
    """
    errors = []
    if (ticket_dir / "concept.md").exists():
        errors.append("concept.md is not allowed in a side-quest ticket (a mystery bug has no lesson)")
    kind = meta.get("bug_kind")
    if "bug_kind" in meta and not is_nonempty_str(kind):
        errors.append("ticket.yaml: 'bug_kind' must be a short name, e.g. off-by-one")
    if "requires" in meta and not is_nonempty_str(meta["requires"]):
        errors.append("ticket.yaml: 'requires' must be a ticket id, e.g. s01-t04")
    minutes = meta.get("estimated_minutes")
    if isinstance(minutes, int) and minutes > MAX_SIDE_QUEST_MINUTES:
        errors.append(f"ticket.yaml: a side quest is short: estimated_minutes at most {MAX_SIDE_QUEST_MINUTES}")
    if is_nonempty_str(kind):
        story = (ticket_dir / "story.md").read_text(encoding="utf-8")
        for label, text in (("title", str(meta.get("title", ""))), ("story.md", story)):
            if kind.lower() in text.lower():
                errors.append(f"{label} names the bug ({kind!r}): a mystery bug must not give its kind away")
    return errors


def check_requires(seasons_root):
    """`requires` on side-quest tickets: a real on-chain ticket with a lesson, teaching the same concept.

    Returns {label: [errors]} for the tickets with a problem.
    """
    tickets = {}  # id -> (label, meta, on_chain, has_lesson)
    for season_dir in sorted(p for p in seasons_root.iterdir() if p.is_dir()):
        chain, _final = season_flags(season_dir)
        for name in season_ticket_order(season_dir):
            ticket_dir = season_dir / "tickets" / name
            try:
                meta = yaml.safe_load((ticket_dir / "ticket.yaml").read_text(encoding="utf-8"))
            except (OSError, yaml.YAMLError):
                continue
            if isinstance(meta, dict) and isinstance(meta.get("id"), str):
                tickets[meta["id"]] = (f"{season_dir.name}/{name}", meta, chain, (ticket_dir / "concept.md").is_file())
    report = {}
    for label, meta, _chain, _lesson in tickets.values():
        required = meta.get("requires")
        if not is_nonempty_str(required):
            continue
        if required not in tickets:
            report.setdefault(label, []).append(f"ticket.yaml: requires {required!r}, which is not a ticket id")
            continue
        _label, other, on_chain, has_lesson = tickets[required]
        problems = []
        if not on_chain:
            problems.append("is not on the main story (an on-chain season)")
        if not has_lesson:
            problems.append("has no lesson (concept.md) to link to")
        if other.get("new_concept") != meta.get("new_concept"):
            problems.append(f"teaches {other.get('new_concept')!r}, not this ticket's new_concept {meta.get('new_concept')!r}")
        if problems:
            report.setdefault(label, []).append(f"ticket.yaml: requires {required!r}, which " + " and ".join(problems))
    return report


def check_season_requires(seasons_root):
    """A side floor's season-level `requires` must be a ticket of an on-chain season, or of
    ANOTHER side floor (sequential modules: Manipulators M2 opens after M1's last ticket).

    Following the floors' `requires` must always end on the story: no floor may require
    one of its own tickets, and no chain of floors may loop back on itself (A needs B,
    B needs A), or neither could ever open. Side floors never gate on-chain seasons or the
    final exam (they only ever need tickets; nothing needs them except later floors).

    Returns {season folder name: [errors]} for the seasons with a problem.
    """
    owner = {}  # ticket id -> (season folder name, "chain" | "floor" | "other")
    floors = {}  # side floor folder name -> the ticket id it requires
    for season_dir in sorted(p for p in seasons_root.iterdir() if p.is_dir()):
        chain, final = season_flags(season_dir)
        required = season_requires(season_dir)
        kind = "chain" if chain else ("floor" if required and not final else "other")
        if kind == "floor":
            floors[season_dir.name] = required
        for name in season_ticket_order(season_dir):
            try:
                meta = yaml.safe_load((season_dir / "tickets" / name / "ticket.yaml").read_text(encoding="utf-8"))
            except (OSError, yaml.YAMLError):
                continue
            if isinstance(meta, dict) and isinstance(meta.get("id"), str):
                owner[meta["id"]] = (season_dir.name, kind)
    report = {}
    for name, required in floors.items():
        where, kind = owner.get(required, (None, None))
        if kind not in ("chain", "floor"):
            report[name] = [f"season.yaml: requires {required!r}, which is not a ticket of an on-chain season "
                            "or of another side floor"]
            continue
        if where == name:
            report[name] = [f"season.yaml: requires {required!r}, one of this floor's own tickets (it could never open)"]
            continue
        path, at = [name], where
        while owner.get(floors.get(at, ""), (None, None))[1] == "floor" and at not in path:
            path.append(at)
            at = owner[floors[at]][0]
        if at in path:
            loop = " → ".join(path[path.index(at):] + [at])
            report[name] = [f"season.yaml: requires {required!r}, but the side floors' requires go round in a "
                            f"circle ({loop}), so none of them could ever open"]
    return report


def check_incident(ticket_dir, meta):
    """logs.txt must have content; time_limit_minutes (optional) must be 1-60."""
    errors = []
    if not (ticket_dir / "logs.txt").read_text(encoding="utf-8").strip():
        errors.append("logs.txt is empty")
    if "time_limit_minutes" in meta:
        limit = meta["time_limit_minutes"]
        if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= MAX_INCIDENT_MINUTES:
            errors.append(f"ticket.yaml: 'time_limit_minutes' must be a whole number from 1 to {MAX_INCIDENT_MINUTES}")
    return errors


def check_review(ticket_dir):
    """Check review.yaml against pr/ (format in the module docstring). Returns error strings."""
    try:
        data = yaml.safe_load((ticket_dir / "review.yaml").read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"review.yaml is not valid YAML: {exc}"]
    if not isinstance(data, dict):
        return ["review.yaml must be a mapping of fields"]

    errors = []
    for field in ["title", "author", "description"]:
        if not is_nonempty_str(data.get(field)):
            errors.append(f"review.yaml: '{field}' is missing or empty")
    if "merged" in data and not isinstance(data["merged"], bool):
        errors.append("review.yaml: 'merged' must be true or false")

    files = data.get("files")
    if not isinstance(files, list) or not files or not all(is_nonempty_str(f) for f in files):
        return errors + ["review.yaml: 'files' must be a non-empty list of paths in pr/"]
    pr_dir = ticket_dir / "pr"
    on_disk = files_in(pr_dir)
    lines = {}  # path -> list of lines
    for rel in files:
        if rel not in on_disk:
            errors.append(f"review.yaml: file {rel} does not exist in pr/")
            continue
        text = on_disk[rel].read_text(encoding="utf-8")
        lines[rel] = text.splitlines()
        starter_file = ticket_dir / "starter" / rel
        if starter_file.is_file() and starter_file.read_text(encoding="utf-8") == text:
            errors.append(f"pr/{rel} is identical to starter/{rel} (the PR must change it)")
        if rel.endswith(".py"):
            try:
                compile(text, rel, "exec")
            except SyntaxError as exc:
                errors.append(f"pr/{rel} is not valid Python: line {exc.lineno}: {exc.msg}")
    for rel in sorted(set(on_disk) - set(files)):
        errors.append(f"pr/{rel} is not listed in review.yaml 'files'")

    issues = data.get("issues")
    if not isinstance(issues, list) or not issues:
        return errors + ["review.yaml: 'issues' must be a non-empty list"]
    seen = {}
    for n, issue in enumerate(issues, start=1):
        where = f"review.yaml: issue {n}"
        if not isinstance(issue, dict):
            errors.append(f"{where} must be a mapping")
            continue
        if not is_nonempty_str(issue.get("explain")):
            errors.append(f"{where}: 'explain' is missing or empty")
        rel = issue.get("file")
        if rel not in files:
            errors.append(f"{where}: file {rel!r} is not one of the PR files {files}")
            continue
        also = issue.get("also_lines", [])
        if not isinstance(also, list):
            errors.append(f"{where}: 'also_lines' must be a list of line numbers")
            also = []
        for line in [issue.get("line")] + also:
            if not isinstance(line, int) or isinstance(line, bool):
                errors.append(f"{where}: line {line!r} must be a whole number")
            elif rel in lines and not 1 <= line <= len(lines[rel]):
                errors.append(f"{where}: line {line} is outside {rel} (1-{len(lines[rel])})")
            elif rel in lines and not lines[rel][line - 1].strip():
                errors.append(f"{where}: line {line} of {rel} is blank")
            elif (rel, line) in seen:
                errors.append(f"{where}: {rel}:{line} is already used by issue {seen[(rel, line)]}")
            else:
                seen[(rel, line)] = n
    return errors


# ---------- byte.yaml (Byte suggests / Ask Byte) ----------

def load_byte(ticket_dir):
    """byte.yaml as loaded YAML, or None if missing. Raises yaml.YAMLError if invalid."""
    path = ticket_dir / "byte.yaml"
    if not path.is_file():
        return None
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def apply_suggestion(text, find, replace):
    """The file text with Byte's replacement applied (find must occur exactly once)."""
    return text.replace(find, replace, 1)


def check_byte(ticket_dir, meta):
    """Format checks for byte.yaml (format in the module docstring). Tests are run separately."""
    try:
        data = load_byte(ticket_dir)
    except yaml.YAMLError as exc:
        return [f"byte.yaml is not valid YAML: {exc}"]
    if not isinstance(data, dict):
        return ["byte.yaml must be a mapping with 'suggestion' and/or 'prompt'"]
    errors = []
    unknown = sorted(set(data) - {"suggestion", "prompt"})
    if unknown:
        errors.append(f"byte.yaml: unknown section(s) {unknown} (allowed: suggestion, prompt)")
    if "suggestion" not in data and "prompt" not in data:
        errors.append("byte.yaml needs a 'suggestion' or a 'prompt' block")
    if "suggestion" in data:
        errors += check_byte_suggestion(ticket_dir, meta, data["suggestion"])
    if "prompt" in data:
        errors += check_byte_prompt(data["prompt"])
    return errors


def check_byte_suggestion(ticket_dir, meta, sug):
    where = "byte.yaml: suggestion"
    if not isinstance(sug, dict):
        return [f"{where} must be a mapping"]
    if meta.get("type") in NO_TEST_TYPES:
        return [f"{where}: only tickets with tests can have a suggestion (this is a {meta.get('type')} ticket)"]
    errors = []
    for field in ["file", "find", "replace", "says", "explain"]:
        if not is_nonempty_str(sug.get(field)):
            errors.append(f"{where}: '{field}' is missing or empty")
    if not isinstance(sug.get("correct"), bool):
        errors.append(f"{where}: 'correct' must be true or false")
    if "partial" in sug:
        if not isinstance(sug["partial"], bool):
            errors.append(f"{where}: 'partial' must be true or false")
        elif sug["partial"] and sug.get("correct") is not True:
            errors.append(f"{where}: 'partial: true' only goes with 'correct: true'")
    if errors:
        return errors
    rel, find, replace = sug["file"], sug["find"], sug["replace"]
    if rel not in (meta.get("files_editable") or []):
        return [f"{where}: file {rel!r} is not in files_editable"]
    starter_file = ticket_dir / "starter" / rel
    if not starter_file.is_file():
        return [f"{where}: file {rel} does not exist in starter/"]
    if find == replace:
        return [f"{where}: 'replace' is the same as 'find' (Byte must propose a change)"]
    text = starter_file.read_text(encoding="utf-8")
    count = text.count(find)
    if count != 1:
        return [f"{where}: 'find' must appear exactly once in starter/{rel}, found {count} time(s)"]
    if rel.endswith(".py"):
        try:
            compile(apply_suggestion(text, find, replace), rel, "exec")
        except SyntaxError as exc:
            errors.append(f"{where}: starter/{rel} with the replacement is not valid Python: line {exc.lineno}: {exc.msg}")
    if "why" in sug:
        errors += check_byte_why(sug["why"])
    return errors


def check_byte_why(why):
    """suggestion.why: the reason the learner must pick together with their decision."""
    where = "byte.yaml: suggestion.why"
    if not isinstance(why, dict):
        return [f"{where} must be a mapping with 'choices' and 'answer'"]
    errors = []
    unknown = sorted(set(why) - {"choices", "answer"})
    if unknown:
        errors.append(f"{where}: unknown field(s) {unknown}")
    choices = why.get("choices")
    if not isinstance(choices, list) or not all(is_nonempty_str(c) for c in choices):
        return errors + [f"{where}: 'choices' must be a list of non-empty strings"]
    if len(choices) != WHY_CHOICES:
        errors.append(f"{where}: needs exactly {WHY_CHOICES} choices, has {len(choices)}")
    if len({c.strip() for c in choices}) != len(choices):
        errors.append(f"{where}: choices must all be different")
    answer = why.get("answer")
    if not isinstance(answer, int) or isinstance(answer, bool):
        errors.append(f"{where}: 'answer' must be a whole number (0-based index)")
    elif not 0 <= answer < len(choices):
        errors.append(f"{where}: answer {answer} is out of range for {len(choices)} choices")
    return errors


def check_byte_prompt(card):
    where = "byte.yaml: prompt"
    if not isinstance(card, dict):
        return [f"{where} must be a mapping"]
    errors = []
    if not is_nonempty_str(card.get("goal")):
        errors.append(f"{where}: 'goal' is missing or empty")
    options = card.get("options")
    if not isinstance(options, list) or not all(isinstance(o, dict) for o in options):
        return errors + [f"{where}: 'options' must be a list of mappings"]
    if not MIN_PROMPT_OPTIONS <= len(options) <= MAX_PROMPT_OPTIONS:
        errors.append(f"{where}: has {len(options)} options, needs {MIN_PROMPT_OPTIONS}-{MAX_PROMPT_OPTIONS}")
    for i, opt in enumerate(options):
        here = f"{where}: option {i}"
        for field in ["prompt", "response_code", "feedback"]:
            if not is_nonempty_str(opt.get(field)):
                errors.append(f"{here}: '{field}' is missing or empty")
        if opt.get("verdict") not in BYTE_VERDICTS:
            errors.append(f"{here}: verdict {opt.get('verdict')!r} must be one of {sorted(BYTE_VERDICTS)}")
        if is_nonempty_str(opt.get("response_code")):
            try:
                compile(opt["response_code"], f"option {i}", "exec")
            except SyntaxError as exc:
                errors.append(f"{here}: response_code is not valid Python: line {exc.lineno}: {exc.msg}")
    prompts = [o["prompt"].strip() for o in options if is_nonempty_str(o.get("prompt"))]
    if len(set(prompts)) != len(prompts):
        errors.append(f"{where}: prompts must all be different")
    best = card.get("best")
    if not isinstance(best, int) or isinstance(best, bool):
        errors.append(f"{where}: 'best' must be a whole number (0-based index)")
    elif not 0 <= best < len(options):
        errors.append(f"{where}: best {best} is out of range for {len(options)} options")
    else:
        if options[best].get("verdict") != "good":
            errors.append(f"{where}: the best option ({best}) must have verdict 'good'")
        others = [i for i, o in enumerate(options) if i != best and o.get("verdict") == "good"]
        if others:
            errors.append(f"{where}: only the best option may be 'good', but option(s) {others} are too")
    return errors


# ---------- formats.yaml (predict / break_it / parsons) ----------

def run_format(request):
    """Run one request through lib/runner/formats.py in a fresh python3 process.

    Returns its result dict, or {"error": ...} on timeout or crash.
    """
    try:
        proc = subprocess.run(
            [sys.executable, str(FORMATS_RUNNER)], input=json.dumps(request),
            capture_output=True, text=True, timeout=TEST_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {"error": f"timed out after {TEST_TIMEOUT_SECONDS}s", "harness": True}
    if proc.returncode != 0:
        return {"error": f"formats runner crashed: {proc.stderr.strip()}", "harness": True}
    return json.loads(proc.stdout)


def normalize_output(text):
    """Same rule as lib/runner/formats.py: ignore trailing spaces and blank lines at the ends."""
    lines = [line.rstrip() for line in str(text).replace("\r\n", "\n").split("\n")]
    return "\n".join(lines).strip("\n")


def check_formats(ticket_dir):
    """Check formats.yaml (format in the module docstring), running every item. Returns error strings."""
    try:
        data = yaml.safe_load((ticket_dir / "formats.yaml").read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"formats.yaml is not valid YAML: {exc}"]
    if not isinstance(data, dict):
        return ["formats.yaml must be a mapping with predict, break_it, parsons and/or trace"]
    errors = []
    unknown = sorted(set(data) - set(FORMAT_SECTIONS))
    if unknown:
        errors.append(f"formats.yaml: unknown section(s) {unknown} (allowed: {', '.join(FORMAT_SECTIONS)})")
    if not any(section in data for section in FORMAT_SECTIONS):
        errors.append("formats.yaml needs at least one of: " + ", ".join(FORMAT_SECTIONS))
    checkers = {"predict": check_predict, "break_it": check_break_it, "parsons": check_parsons, "trace": check_trace}
    for section in FORMAT_SECTIONS:
        if section not in data:
            continue
        items = data[section]
        if not isinstance(items, list) or not items:
            errors.append(f"formats.yaml: '{section}' must be a non-empty list")
            continue
        for i, item in enumerate(items):
            where = f"formats.yaml: {section} {i}"
            if not isinstance(item, dict):
                errors.append(f"{where} must be a mapping")
                continue
            errors += checkers[section](item, where)
    return errors


def _required_strings(item, where, fields):
    return [f"{where}: '{f}' is missing or empty" for f in fields if not is_nonempty_str(item.get(f))]


def _compiles(code, where, label, mode="exec"):
    try:
        compile(code, label, mode)
    except SyntaxError as exc:
        return [f"{where}: {label} is not valid Python: line {exc.lineno}: {exc.msg}"]
    return []


def check_predict(item, where):
    errors = _required_strings(item, where, ["code", "question", "answer", "explain"])
    if errors:
        return errors
    code, answer = item["code"], item["answer"]
    lines = len(code.strip("\n").splitlines())
    if lines > MAX_PREDICT_LINES:
        errors.append(f"{where}: code has {lines} lines, at most {MAX_PREDICT_LINES}")
    if "choices" in item:
        choices = item["choices"]
        if not isinstance(choices, list) or not all(is_nonempty_str(c) for c in choices):
            errors.append(f"{where}: 'choices' must be a list of non-empty strings")
        else:
            if not MIN_CHOICES <= len(choices) <= MAX_CHOICES:
                errors.append(f"{where}: has {len(choices)} choices, needs {MIN_CHOICES}-{MAX_CHOICES}")
            normalized = [normalize_output(c) for c in choices]
            if len(set(normalized)) != len(choices):
                errors.append(f"{where}: choices must all be different")
            if normalized.count(normalize_output(answer)) != 1:
                errors.append(f"{where}: exactly one choice must equal the answer {answer!r}")
    compile_errors = _compiles(code, where, "code")
    if compile_errors:
        return errors + compile_errors
    result = run_format({"kind": "predict", "code": code})
    if result.get("error"):
        return errors + [f"{where}: code raised {result['error']} (predict code must run cleanly)"]
    if normalize_output(result["stdout"]) != normalize_output(answer):
        errors.append(f"{where}: answer {answer!r} is wrong: the code really prints {result['stdout']!r}")
    return errors


def check_break_it(item, where):
    errors = _required_strings(
        item, where, ["says", "code", "spec", "call", "input_hint", "check", "normal_input", "example_input", "explain"])
    for field in ["helpers", "miss"]:
        if field in item and not is_nonempty_str(item[field]):
            errors.append(f"{where}: '{field}' must be a non-empty string when present")
    if "crash_counts" in item and not isinstance(item["crash_counts"], bool):
        errors.append(f"{where}: 'crash_counts' must be true or false")
    if errors:
        return errors
    if "{input}" not in item["call"]:
        errors.append(f"{where}: 'call' must contain {{input}}, e.g. split_bill({{input}})")
    errors += _compiles(item["code"] + "\n" + item.get("helpers", ""), where, "code + helpers")
    errors += _compiles(item["call"].replace("{input}", "*args"), where, "call", "eval")
    errors += _compiles(item["check"].replace("{input}", "*args"), where, "check", "eval")
    if errors:
        return errors
    request = {"kind": "break_it", "code": item["code"], "helpers": item.get("helpers", ""), "call": item["call"],
               "check": item["check"], "crash_counts": item.get("crash_counts", False)}
    normal = run_format({**request, "input": item["normal_input"]})
    if normal.get("status") != "holds":
        detail = normal.get("message") or normal.get("error") or f"Byte's code returned {normal.get('result')}"
        errors.append(f"{where}: Byte's code must meet the spec on normal_input {item['normal_input']!r}, "
                      f"but got {normal.get('status')}: {detail}")
    example = run_format({**request, "input": item["example_input"]})
    if example.get("status") != "broken":
        detail = example.get("message") or example.get("error") or f"Byte's code returned {example.get('result')}"
        errors.append(f"{where}: example_input {item['example_input']!r} must break the spec, "
                      f"but got {example.get('status')}: {detail}")
    return errors


def check_parsons(item, where):
    errors = _required_strings(item, where, ["goal"])
    for field in ["check", "expected_output", "explain"]:
        if field in item and not isinstance(item[field], str):
            errors.append(f"{where}: '{field}' must be a string when present")
    if not is_nonempty_str(item.get("check")) and not isinstance(item.get("expected_output"), str):
        errors.append(f"{where}: needs a 'check' (asserts) or an 'expected_output'")
    lines = item.get("lines")
    if not isinstance(lines, list) or not all(is_nonempty_str(line) for line in lines):
        return errors + [f"{where}: 'lines' must be a list of non-blank lines"]
    if len(lines) < MIN_PARSONS_LINES:
        errors.append(f"{where}: needs at least {MIN_PARSONS_LINES} lines, has {len(lines)}")
    distractors = item.get("distractors")
    if not isinstance(distractors, list) or not distractors or not all(isinstance(d, dict) for d in distractors):
        return errors + [f"{where}: 'distractors' must be a non-empty list of mappings"]
    all_lines = list(lines)
    for j, d in enumerate(distractors):
        here = f"{where}: distractor {j}"
        errors += _required_strings(d, here, ["line", "explain"])
        replaces = d.get("replaces")
        if not isinstance(replaces, int) or isinstance(replaces, bool) or not 0 <= replaces < len(lines):
            errors.append(f"{here}: 'replaces' must be a 0-based index into lines (0-{len(lines) - 1})")
        if is_nonempty_str(d.get("line")):
            all_lines.append(d["line"])
    if len(set(all_lines)) != len(all_lines):
        errors.append(f"{where}: every line and distractor must be different")
    if errors:
        return errors
    program = "\n".join(lines)
    errors += _compiles(program, where, "the correct order")
    check = item.get("check") or ""
    errors += _compiles(check, where, "check")
    if errors:
        return errors
    request = {"kind": "parsons", "check": check, "expected_output": item.get("expected_output")}
    result = run_format({**request, "program": program})
    if not result.get("passed"):
        errors.append(f"{where}: the correct order fails its check: {result.get('error')}")
    for j, d in enumerate(distractors):
        swapped = list(lines)
        swapped[d["replaces"]] = d["line"]
        result = run_format({**request, "program": "\n".join(swapped)})
        if result.get("passed"):
            errors.append(f"{where}: distractor {j} ({d['line'].strip()!r}) passes the check too, so it isn't a trap")
    return errors


IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def check_trace(item, where):
    errors = _required_strings(item, where, ["code", "explain"])
    watch, rows = item.get("watch"), item.get("rows")
    if not isinstance(watch, list) or not watch or not all(isinstance(w, str) and IDENTIFIER.match(w) for w in watch):
        errors.append(f"{where}: 'watch' must be a list of variable names")
    elif len(watch) > MAX_TRACE_WATCH or len(set(watch)) != len(watch):
        errors.append(f"{where}: 'watch' needs 1-{MAX_TRACE_WATCH} different variable names")
    if not isinstance(rows, int) or isinstance(rows, bool) or not 1 <= rows <= MAX_TRACE_ROWS:
        errors.append(f"{where}: 'rows' must be a whole number from 1 to {MAX_TRACE_ROWS}")
    if errors:
        return errors
    code = item["code"]
    lines = len(code.strip("\n").splitlines())
    if not 2 <= lines <= MAX_TRACE_LINES:
        errors.append(f"{where}: code has {lines} lines, needs 2-{MAX_TRACE_LINES}")
    compile_errors = _compiles(code, where, "code")
    if compile_errors:
        return errors + compile_errors
    result = run_format({"kind": "trace", "code": code, "watch": watch})
    if result.get("truncated"):
        return errors + [f"{where}: code takes too many steps to trace (a loop that never ends?)"]
    if result.get("error"):
        return errors + [f"{where}: code raised {result['error']} (trace code must run cleanly)"]
    real = result["rows"]
    if len(real) != rows:
        errors.append(f"{where}: rows is {rows}, but tracing the code gives {len(real)} "
                      f"(one per line that gives {', '.join(watch)} a new value)")
    for c, name in enumerate(watch):
        if all(row["values"][c] is None for row in real):
            errors.append(f"{where}: '{name}' never gets a value (is it a variable in the code?)")
    too_long = sorted({v for row in real for v in row["values"]
                       if v is not None and (len(v) > MAX_TRACE_VALUE or "..." in v or "…" in v)})
    if too_long:
        errors.append(f"{where}: values too long to type in a cell (max {MAX_TRACE_VALUE} characters): {too_long[:3]}")
    return errors


def check_byte_suggestion_tests(ticket_dir):
    """Honesty check: apply the suggestion to a copy of starter/ and run the tests.

    correct: true must pass, correct: false must fail. With partial: true the
    change must keep every test that passes on starter/ passing, make at least
    one more test pass, and still leave at least one test failing.
    Returns error strings. Call only after check_byte() found no errors.
    """
    try:
        data = load_byte(ticket_dir)
    except yaml.YAMLError:
        return []  # already reported by check_byte
    sug = data.get("suggestion") if isinstance(data, dict) else None
    if not isinstance(sug, dict):
        return []
    rel, find, replace, correct = sug["file"], sug["find"], sug["replace"], sug["correct"]
    with tempfile.TemporaryDirectory() as tmp:
        code_dir = Path(tmp) / "code"
        # Skip __pycache__: a cached .pyc of the starter file can look up to date
        # (same size, same second) and Python would run the old code instead.
        shutil.copytree(ticket_dir / "starter", code_dir, ignore=shutil.ignore_patterns("__pycache__"))
        target = code_dir / rel
        target.write_text(apply_suggestion(target.read_text(encoding="utf-8"), find, replace), encoding="utf-8")
        result = run_ticket_tests(code_dir, ticket_dir / "tests")
    if sug.get("partial"):
        return check_partial_suggestion(run_ticket_tests(ticket_dir / "starter", ticket_dir / "tests"), result)
    if correct and not result["passed"]:
        failing = [f"{r['file']}::{r['name']}" for r in result.get("results", []) if r["status"] != "pass"]
        detail = result.get("error") or ", ".join(failing) or "no tests ran"
        return [f"byte.yaml: suggestion says correct: true, but starter + replacement fails the tests ({detail})"]
    if not correct and result["passed"]:
        return ["byte.yaml: suggestion says correct: false, but starter + replacement passes every test"]
    return []


def check_partial_suggestion(before, after):
    """partial: true means "right as far as it goes". Compares test results on starter/ (before)
    with starter/ + Byte's change (after). Returns error strings."""
    where = "byte.yaml: suggestion says partial: true"
    if "error" in after:
        return [f"{where}, but starter + replacement {after['error']}"]
    status = lambda result: {(r["file"], r["name"]): r["status"] for r in result.get("results", [])}
    old, new = status(before), status(after)
    errors = []
    broken = sorted(f"{f}::{n}" for (f, n), s in old.items() if s == "pass" and new.get((f, n)) != "pass")
    if broken:
        errors.append(f"{where}, but it breaks tests that passed before: {', '.join(broken)}")
    if sum(s == "pass" for s in new.values()) <= sum(s == "pass" for s in old.values()):
        errors.append(f"{where}, but it doesn't make any more tests pass")
    if after["passed"]:
        errors.append(f"{where}, but starter + replacement passes every test (that's a full fix: drop 'partial')")
    return errors


def check_ticket_tests(ticket_dir):
    """Starter must fail, solution must pass. Returns a list of error strings."""
    errors = []
    tests_dir = ticket_dir / "tests"

    starter = run_ticket_tests(ticket_dir / "starter", tests_dir)
    if starter["passed"]:
        errors.append("starter/ already passes all tests (nothing for the learner to do)")

    solution = run_ticket_tests(ticket_dir / "solution", tests_dir)
    if not solution["passed"]:
        if "error" in solution:
            errors.append(f"solution/ {solution['error']}")
        for r in solution.get("results", []):
            if r["status"] != "pass":
                errors.append(f"solution/ fails {r['file']}::{r['name']}: {r['message']}")
        if not solution.get("results") and "error" not in solution:
            errors.append("solution/ ran no tests")
    return errors


def files_in(folder):
    return {p.relative_to(folder).as_posix(): p for p in folder.rglob("*")
            if p.is_file() and "__pycache__" not in p.parts}


def resulting_code(ticket_dir):
    """The codebase a ticket leaves behind, as (label, {path: file}).

    - read: unchanged, so its starter/
    - review: its starter/, plus the PR's files (pr/) if review.yaml says `merged: true`
    - everything else: its solution/
    Returns (label, None) if the folder it needs is missing.
    """
    ticket_type = load_ticket_type(ticket_dir)
    if ticket_type not in NO_TEST_TYPES:
        folder = ticket_dir / "solution"
        return "solution", files_in(folder) if folder.is_dir() else None
    if not (ticket_dir / "starter").is_dir():
        return "starter", None
    files = files_in(ticket_dir / "starter")
    if ticket_type == "review" and review_is_merged(ticket_dir) and (ticket_dir / "pr").is_dir():
        files.update(files_in(ticket_dir / "pr"))
        return "starter+pr", files
    return "starter", files


def review_is_merged(ticket_dir):
    try:
        data = yaml.safe_load((ticket_dir / "review.yaml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return False
    return isinstance(data, dict) and data.get("merged") is True


def check_evolution(prev_dir, next_dir):
    """Every file in the code prev_dir leaves behind must appear unchanged in starter(next).

    Usually that is solution(prev). See resulting_code() for read and review tickets.
    """
    errors = []
    source, prev_files = resulting_code(prev_dir)
    if prev_files is None:
        return errors
    next_files = files_in(next_dir / "starter")
    for rel, path in sorted(prev_files.items()):
        if rel not in next_files:
            errors.append(f"{rel} from {prev_dir.name}/{source} is missing in starter/")
        elif path.read_bytes() != next_files[rel].read_bytes():
            errors.append(f"{rel} differs from {prev_dir.name}/{source}")
    return errors


def season_ticket_order(season_dir):
    """Ticket folder names in the order season.yaml lists them ([] if unreadable)."""
    try:
        season = yaml.safe_load((season_dir / "season.yaml").read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return []
    if not isinstance(season, dict):
        return []
    return season.get("tickets") or []


def season_flags(season_dir):
    """(chain, final) from season.yaml: chain defaults to True, final to False."""
    try:
        season = yaml.safe_load((season_dir / "season.yaml").read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return True, False
    if not isinstance(season, dict):
        return True, False
    return season.get("chain", True) is not False, season.get("final", False) is True


MAX_ICON_CHARS = 8


def season_requires(season_dir):
    """season.yaml `requires` (a side floor's opening ticket), or None."""
    try:
        season = yaml.safe_load((season_dir / "season.yaml").read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return None
    value = season.get("requires") if isinstance(season, dict) else None
    return value if is_nonempty_str(value) else None


def validate_season(season_dir, prev=None):
    """Returns a dict {label: [errors]} for the season and each of its tickets.

    prev is the last ticket folder of the previous on-chain season (if any), so the
    evolving-codebase check continues across the season boundary. An off-chain
    season (`chain: false`) skips the evolving-codebase check entirely.
    """
    report = {}
    season_file = season_dir / "season.yaml"
    if not season_file.is_file():
        return {season_dir.name: ["missing season.yaml"]}
    season = yaml.safe_load(season_file.read_text(encoding="utf-8")) or {}
    order = season.get("tickets") or []
    season_errors = []
    for field in ["id", "title", "intro", "tickets"]:
        if field not in season:
            season_errors.append(f"season.yaml: missing field '{field}'")
    for flag in ["chain", "final"]:
        if flag in season and not isinstance(season[flag], bool):
            season_errors.append(f"season.yaml: '{flag}' must be true or false")
    chain, final = season_flags(season_dir)
    if final and chain:
        season_errors.append("season.yaml: a final season must be off-chain (add `chain: false`)")
    side_floor = False
    if "requires" in season:
        if not is_nonempty_str(season["requires"]):
            season_errors.append("season.yaml: 'requires' must be a ticket id, e.g. s01-t10")
        elif chain or final:
            season_errors.append("season.yaml: 'requires' is only for side floors (`chain: false`, not final)")
        else:
            side_floor = True
    long_lesson = season.get("lesson") == "long"
    if "lesson" in season:
        if season["lesson"] not in LESSON_KINDS:
            season_errors.append(f"season.yaml: 'lesson' must be one of {list(LESSON_KINDS)}, got {season['lesson']!r}")
        elif long_lesson and not side_floor:
            season_errors.append("season.yaml: 'lesson: long' is only for side floors (deep optional modules)")
            long_lesson = False
    if "short_title" in season:
        if not (is_nonempty_str(season["short_title"]) and len(season["short_title"]) <= MAX_SHORT_TITLE_CHARS):
            season_errors.append(f"season.yaml: 'short_title' must be a short text, at most {MAX_SHORT_TITLE_CHARS} characters")
        elif not side_floor:
            season_errors.append("season.yaml: 'short_title' is only for side floors (their name on the HQ board)")
    if "icon" in season and not (is_nonempty_str(season["icon"]) and len(season["icon"]) <= MAX_ICON_CHARS):
        season_errors.append(f"season.yaml: 'icon' must be a short text (an emoji), at most {MAX_ICON_CHARS} characters")
    if not chain:
        prev = None

    tickets_root = season_dir / "tickets"
    on_disk = {p.name for p in tickets_root.iterdir() if p.is_dir()} if tickets_root.is_dir() else set()
    for name in sorted(on_disk - set(order)):
        season_errors.append(f"ticket folder {name} is not listed in season.yaml")
    report[season_dir.name] = season_errors

    for name in order:
        ticket_dir = tickets_root / name
        label = f"{season_dir.name}/{name}"
        if not ticket_dir.is_dir():
            report[label] = ["listed in season.yaml but folder does not exist"]
            prev = None
            continue
        errors = check_ticket_meta(ticket_dir, final=final, side_quest=not chain and not final and not side_floor,
                                   side_floor=side_floor, long_lesson=long_lesson)
        if not errors and load_ticket_type(ticket_dir) not in NO_TEST_TYPES:
            errors += check_ticket_tests(ticket_dir)
            if (ticket_dir / "byte.yaml").is_file():
                errors += check_byte_suggestion_tests(ticket_dir)
        if prev is not None and (ticket_dir / "starter").is_dir():
            errors += check_evolution(prev, ticket_dir)
        report[label] = errors
        # On-chain: the chain continues. A side floor chains only inside itself.
        prev = ticket_dir if chain or side_floor else None
    return report


def check_warmup(path, ticket_ids):
    """Check one warm-up file. Returns (warm-up id or None, list of error strings)."""
    name = path.name
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return None, [f"{name}: not valid YAML: {exc}"]
    if not isinstance(data, dict):
        return None, [f"{name}: must be a mapping of fields"]

    errors = []
    for field in WARMUP_STRING_FIELDS:
        if not is_nonempty_str(data.get(field)):
            errors.append(f"{name}: '{field}' is missing or empty")
    warmup_id = data.get("id") if is_nonempty_str(data.get("id")) else None
    if warmup_id and warmup_id != path.stem:
        errors.append(f"{name}: id {warmup_id!r} should match the file name {path.stem!r}")
    concept = data.get("concept")
    if is_nonempty_str(concept) and concept not in WARMUP_CONCEPTS:
        errors.append(f"{name}: concept {concept!r} is not one of {sorted(WARMUP_CONCEPTS)}")
    after = data.get("after")
    if is_nonempty_str(after) and after not in ticket_ids:
        errors.append(f"{name}: after {after!r} is not a ticket id")

    code = data.get("code")
    if is_nonempty_str(code):
        lines = len(code.strip("\n").splitlines())
        if not MIN_WARMUP_LINES <= lines <= MAX_WARMUP_LINES:
            errors.append(f"{name}: code has {lines} lines, needs {MIN_WARMUP_LINES}-{MAX_WARMUP_LINES}")
        try:
            compile(code, name, "exec")
        except SyntaxError as exc:
            errors.append(f"{name}: code has a syntax error: {exc.msg} (line {exc.lineno})")

    choices = data.get("choices")
    if not isinstance(choices, list) or not all(is_nonempty_str(c) for c in choices):
        errors.append(f"{name}: 'choices' must be a list of non-empty strings")
        return warmup_id, errors
    if not MIN_CHOICES <= len(choices) <= MAX_CHOICES:
        errors.append(f"{name}: has {len(choices)} choices, needs {MIN_CHOICES}-{MAX_CHOICES}")
    if len({c.strip() for c in choices}) != len(choices):
        errors.append(f"{name}: choices must all be different")
    answer = data.get("answer")
    if not isinstance(answer, int) or isinstance(answer, bool):
        errors.append(f"{name}: 'answer' must be a whole number (0-based index)")
    elif not 0 <= answer < len(choices):
        errors.append(f"{name}: answer {answer} is out of range for {len(choices)} choices")
    return warmup_id, errors


def validate_warmups(warmups_dir, ticket_ids):
    """Check every warm-up file. Returns a list of error strings."""
    errors, seen = [], {}
    files = sorted(warmups_dir.glob("*.yaml"))
    if not files:
        return ["warmups/ has no .yaml files"]
    for path in files:
        warmup_id, file_errors = check_warmup(path, ticket_ids)
        errors += file_errors
        if warmup_id in seen:
            errors.append(f"{path.name}: id {warmup_id!r} is also used by {seen[warmup_id]}")
        elif warmup_id:
            seen[warmup_id] = path.name
    return errors


# ---------- the skills check (content/assessment/skills-check.yaml) ----------

SKILLS_CHECK_ITEMS = 12
SKILLS_KINDS = ("predict", "catch_input", "spot_line", "pick_answer")
PICK_ANSWER_CHOICES = 3
# The right answer may be the strictly longest choice in at most this share of items.
MAX_LONGEST_RIGHT_SHARE = 0.25


def run_python(program):
    """Run a program in a fresh python3 process. Returns (stdout, error or None)."""
    try:
        proc = subprocess.run([sys.executable, "-I", "-c", program], capture_output=True, text=True,
                              timeout=TEST_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        return "", f"timed out after {TEST_TIMEOUT_SECONDS}s"
    if proc.returncode != 0:
        lines = proc.stderr.strip().splitlines()
        return proc.stdout, lines[-1] if lines else f"exit code {proc.returncode}"
    return proc.stdout, None


def right_is_longest(choices, answer):
    """True if choices[answer] is strictly longer than every other choice."""
    length = len(choices[answer].strip())
    return all(length > len(c.strip()) for i, c in enumerate(choices) if i != answer)


def check_skills_check(path):
    """Check skills-check.yaml (format in the module docstring), running every item."""
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"skills-check.yaml is not valid YAML: {exc}"]
    if not isinstance(data, dict):
        return ["skills-check.yaml must be a mapping with title, intro and items"]
    errors = _required_strings(data, "skills-check.yaml", ["title", "intro"])
    items = data.get("items")
    if not isinstance(items, list) or not all(isinstance(i, dict) for i in items):
        return errors + ["skills-check.yaml: 'items' must be a list of mappings"]
    if len(items) != SKILLS_CHECK_ITEMS:
        errors.append(f"skills-check.yaml: needs exactly {SKILLS_CHECK_ITEMS} items, has {len(items)}")
    seen, kinds, longest_right = {}, set(), []
    for n, item in enumerate(items):
        item_id = item.get("id")
        where = f"skills-check.yaml: item {n} ({item_id})"
        if not is_nonempty_str(item_id):
            errors.append(f"skills-check.yaml: item {n}: 'id' is missing or empty")
        elif item_id in seen:
            errors.append(f"{where}: id is also used by item {seen[item_id]}")
        else:
            seen[item_id] = n
        item_errors = check_skills_item(item, where)
        errors += item_errors
        kinds.add(item.get("kind"))
        if not item_errors and right_is_longest(item["choices"], item["answer"]):
            longest_right.append(item_id)
    missing = [k for k in SKILLS_KINDS if k not in kinds]
    if missing:
        errors.append(f"skills-check.yaml: every kind must be used at least once, missing {missing}")
    allowed = int(MAX_LONGEST_RIGHT_SHARE * len(items))
    if len(longest_right) > allowed:
        errors.append(f"skills-check.yaml: the right answer is the longest choice in {len(longest_right)} items "
                      f"{longest_right}, at most {allowed} allowed (or 'pick the longest' becomes a strategy)")
    return errors


def check_skills_item(item, where):
    kind = item.get("kind")
    if kind not in SKILLS_KINDS:
        return [f"{where}: kind {kind!r} must be one of {list(SKILLS_KINDS)}"]
    errors = _required_strings(item, where, ["prompt", "explain"])
    choices = item.get("choices")
    if not isinstance(choices, list) or not all(is_nonempty_str(c) for c in choices):
        return errors + [f"{where}: 'choices' must be a list of non-empty strings"]
    if not MIN_CHOICES <= len(choices) <= MAX_CHOICES:
        errors.append(f"{where}: has {len(choices)} choices, needs {MIN_CHOICES}-{MAX_CHOICES}")
    if len({c.strip() for c in choices}) != len(choices):
        errors.append(f"{where}: choices must all be different")
    answer = item.get("answer")
    if not isinstance(answer, int) or isinstance(answer, bool) or not 0 <= answer < len(choices):
        errors.append(f"{where}: 'answer' must be a 0-based index into choices")
    if errors:
        return errors
    checker = {"predict": check_skills_predict, "catch_input": check_skills_catch,
               "spot_line": check_skills_spot, "pick_answer": check_skills_pick}[kind]
    return checker(item, where)


def check_skills_predict(item, where):
    errors = _required_strings(item, where, ["code"])
    if errors:
        return errors
    stdout, error = run_python(item["code"])
    if error:
        return [f"{where}: code raised {error} (predict code must run cleanly)"]
    out = normalize_output(stdout)
    right = [i for i, c in enumerate(item["choices"]) if normalize_output(c) == out]
    if right != [item["answer"]]:
        return [f"{where}: the code prints {out!r}, which must be exactly choices[answer] "
                f"(matching choices: {right}, answer: {item['answer']})"]
    return []


CATCH_PROGRAM = """
import json
def outcome(source, call):
    ns = {}
    exec(source, ns)
    try:
        return ["ok", repr(eval(call, ns))]
    except Exception as exc:
        return ["raises", type(exc).__name__]
code, reference, call, choices = json.loads(%r)
print(json.dumps([outcome(code, call.replace("{input}", c)) != outcome(reference, call.replace("{input}", c))
                  for c in choices]))
"""


def check_skills_catch(item, where):
    errors = _required_strings(item, where, ["code", "reference", "call"])
    if errors:
        return errors
    if "{input}" not in item["call"]:
        return [f"{where}: 'call' must contain {{input}}"]
    data = json.dumps([item["code"], item["reference"], item["call"], item["choices"]])
    stdout, error = run_python(CATCH_PROGRAM % data)
    if error:
        return [f"{where}: couldn't run Byte's code and the reference: {error}"]
    differs = [i for i, d in enumerate(json.loads(stdout)) if d]
    if differs != [item["answer"]]:
        return [f"{where}: only choices[answer] ({item['answer']}) may catch the bug, "
                f"but these choices make Byte's code and the reference disagree: {differs}"]
    return []


def check_skills_spot(item, where):
    errors = _required_strings(item, where, ["code", "fix", "check"])
    if errors:
        return errors
    lines = item["code"].splitlines()
    stripped = [line.strip() for line in lines]
    for c in item["choices"]:
        if stripped.count(c.strip()) != 1:
            errors.append(f"{where}: choice {c!r} must be exactly one line of the code")
    if errors:
        return errors
    _, error = run_python(item["code"] + "\n" + item["check"])
    if not error:
        errors.append(f"{where}: Byte's code already passes the check, so there is no bug to spot")
    target = stripped.index(item["choices"][item["answer"]].strip())
    indent = lines[target][: len(lines[target]) - len(lines[target].lstrip())]
    fixed = lines[:target] + [indent + item["fix"].strip()] + lines[target + 1:]
    _, error = run_python("\n".join(fixed) + "\n" + item["check"])
    if error:
        errors.append(f"{where}: with the answer line replaced by the fix, the check still fails: {error}")
    return errors


def check_skills_pick(item, where):
    errors = _required_strings(item, where, ["check"])
    if len(item["choices"]) != PICK_ANSWER_CHOICES:
        errors.append(f"{where}: pick_answer needs exactly {PICK_ANSWER_CHOICES} answers")
    if errors:
        return errors
    passing = [i for i, c in enumerate(item["choices"]) if run_python(c + "\n" + item["check"])[1] is None]
    if passing != [item["answer"]]:
        return [f"{where}: only choices[answer] ({item['answer']}) may pass the check, but these pass: {passing}"]
    return []


def check_byte_why_lengths(seasons_root):
    """Across every byte.yaml suggestion with a `why`, the right reason may be the strictly
    longest choice in at most MAX_LONGEST_RIGHT_SHARE of them, or "pick the longest reason"
    becomes a way to score without checking Byte's code (curriculum audit)."""
    longest, total = [], 0
    for path in sorted(seasons_root.glob("*/tickets/*/byte.yaml")):
        try:
            data = load_byte(path.parent)
        except yaml.YAMLError:
            continue  # reported by the ticket's own checks
        sug = data.get("suggestion") if isinstance(data, dict) else None
        why = sug.get("why") if isinstance(sug, dict) else None
        if not isinstance(why, dict) or check_byte_why(why):
            continue  # missing or malformed: malformed ones are reported per ticket
        total += 1
        if right_is_longest(why["choices"], why["answer"]):
            longest.append(f"{path.parents[2].name}/{path.parent.name}")
    allowed = int(MAX_LONGEST_RIGHT_SHARE * total)
    if len(longest) > allowed:
        return [f"byte.yaml why: the right reason is the strictly longest choice in {len(longest)} of {total} "
                f"suggestions, at most {allowed} allowed (or 'pick the longest' becomes a strategy). "
                f"Make a wrong reason at least as long in some of: {longest}"]
    return []


# ---------- Writing: the slop check (docs/writing/style-guide.md) ----------
# Measures the writing tells that made the old copy read machine-made: dashes, stock phrases,
# exclamation marks and emoji as tone, the "not X, but Y" rebuttal, colon-as-dash, and
# copy-paste frames. Code, maths and quoted strings are not voice, so they are removed first.

SLOP_MIN_WORDS = 30
SLOP_MAX_EXCL_PER_K = 12
SLOP_MAX_EMOJI_PER_K = 15
SLOP_MAX_REBUTTALS = 1
SLOP_MAX_COLON_PER_K = 30
SLOP_NGRAM = 7
SLOP_NGRAM_FILES = 3
SLOP_MAX_HEADING_LESSONS = 3
SLOP_YAML_FILES = ("questions.yaml", "byte.yaml", "formats.yaml", "review.yaml", "season.yaml")
# YAML keys whose values are code, ids or data, never prose.
SLOP_SKIP_KEYS = {
    "id", "file", "files", "find", "replace", "code", "starter", "solution", "files_editable", "concepts",
    "concept", "type", "level", "track", "new_concept", "after", "path", "tests", "answer", "line", "lines",
    "also_lines", "lang", "expected", "input", "output", "call", "setup", "fixture", "args", "kind", "format",
    "target", "tickets", "season", "seed", "pieces", "blocks", "distractors", "snippet", "program", "source",
    "response_code", "check", "fix", "watch", "rows", "requires", "icon", "chain", "final", "lesson", "best",
    "correct", "partial", "author", "short_title", "bug_kind", "stdin", "func", "values", "columns",
}
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⭐⭕⌚-⏿]")
SLOP_WORD = re.compile(r"[A-Za-z][A-Za-z'’]*")
SLOP_QUOTED = re.compile(r"\"[^\"\n]*\"|“[^”\n]*”|(?<![A-Za-z])'[^'\n]{1,80}'(?![A-Za-z])")
SLOP_EXCL = re.compile(r"(?<![0-9)\]!])!(?!=)")
SLOP_DASH = re.compile("[—–]")
SLOP_BANNED = re.compile(
    r"\b(delv(?:e|es|ing)|dive (?:right )?in(?:to)?|seamless(?:ly)?|leverag(?:e|es|ing)|unlock(?:s|ed|ing)?|"
    r"elevat(?:e|es|ing)|journey|empower(?:s|ing)?|crucial(?:ly)?|vital|game[- ]changer|let[’']s|"
    r"great (?:job|work)|awesome|you[’']ve got this|here[’']s the thing|in this lesson)\b", re.I)
SLOP_REBUTTAL = re.compile(
    r"\bnot (?:just |only |merely )?[^.;:!?\n]{1,50}?, but\b"
    r"|\b(?:it|this|that)[’']?s not (?:just |only )?[^.;!?\n]{1,40}?[.;,] (?:it|this|that)[’']?s\b"
    r"|\b(?:isn[’']t|is not|aren[’']t) (?:just|only)\b", re.I)
SLOP_MIDCOLON = re.compile(r"[a-z)\]] ?: [a-z]")
SLOP_STORY_HEADER = re.compile(r"^\*\*(?:From|To|Subject|Ticket|Bounty):\*\*.*$", re.M)


def slop_prose_md(text):
    """Markdown prose only: no fenced code, inline code, maths, link targets or markup."""
    text = re.sub(r"^```.*?^```[ \t]*$", " ", text, flags=re.M | re.S)
    text = re.sub(r"`[^`\n]*`", " CODE ", text)
    text = re.sub(r"\$\$.*?\$\$", " ", text, flags=re.S)
    text = re.sub(r"\$[^$\n]+\$", " MATH ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    return text


def slop_looks_like_code(value):
    return "\n" in value.strip() and bool(re.search(r"^\s{2,}\S|\bdef |\breturn\b|==|^\s*#|\bimport ", value, re.M))


def slop_yaml_strings(node, key=None):
    """Every prose string in a YAML document (code fields and code-looking values skipped)."""
    if isinstance(node, dict):
        for k, v in node.items():
            if str(k) not in SLOP_SKIP_KEYS:
                yield from slop_yaml_strings(v, str(k))
    elif isinstance(node, list):
        for v in node:
            yield from slop_yaml_strings(v, key)
    elif isinstance(node, str) and not slop_looks_like_code(node):
        yield node


def slop_chat_lines(path):
    """The text of every chat line in lib/game/teamChat.ts (`text:` values and Byte's lines)."""
    src = path.read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r"text:\s*([^\n]*)", src):
        out += [a or b for a, b in re.findall(r"`((?:[^`\\]|\\.)*)`|\"((?:[^\"\\]|\\.)*)\"", m.group(1))]
    block = re.search(r"BYTE_LINES[^{]*\{(.*?)\n\};", src, re.S)
    if block:
        out += re.findall(r":\s*\"((?:[^\"\\]|\\.)*)\"", block.group(1))
    return [re.sub(r"\$\{[^}]*\}", "X", t) for t in out]


def slop_sources(content_dir, chat_file=None):
    """(label, prose text) for every file the slop check reads."""
    content_dir = Path(content_dir)
    out = []
    for path in sorted(content_dir.rglob("*")):
        rel = path.relative_to(content_dir)
        if not path.is_file() or {"starter", "solution", "tests", "pr", "team_tests"} & set(rel.parts[:-1]):
            continue
        label = f"content/{rel.as_posix()}"
        if path.suffix == ".md":
            text = path.read_text(encoding="utf-8")
            if path.name == "story.md":  # the header lines are a form, not voice
                text = SLOP_STORY_HEADER.sub("", text)
            out.append((label, slop_prose_md(text)))
        elif path.name in SLOP_YAML_FILES or rel.parts[0] == "warmups" or path.name == "skills-check.yaml":
            if path.suffix not in (".yaml", ".yml"):
                continue
            try:
                data = yaml.safe_load(path.read_text(encoding="utf-8"))
            except yaml.YAMLError:
                continue  # reported by the ticket's own checks
            out.append((label, "\n".join(slop_prose_md(s) for s in slop_yaml_strings(data))))
    if chat_file is not None and Path(chat_file).is_file():
        out.append(("lib/game/teamChat.ts", "\n".join(slop_chat_lines(Path(chat_file)))))
    return out


def slop_file(prose):
    """Fails and warnings for one file's prose. Returns (words, fails, warns)."""
    prose = SLOP_QUOTED.sub(" ", prose)  # quoted strings are what the code prints or a person said
    words = len(SLOP_WORD.findall(prose))
    if words < SLOP_MIN_WORDS:
        return words, [], []
    per_k = 1000 / words
    excl = len(SLOP_EXCL.findall(prose))
    emoji = len(EMOJI.findall(prose))
    dashes = len(SLOP_DASH.findall(prose))
    banned = sorted({m.group(0).lower() for m in SLOP_BANNED.finditer(prose)})
    rebuttals = len(SLOP_REBUTTAL.findall(prose))
    colons = len(SLOP_MIDCOLON.findall(prose))
    fails, warns = [], []
    if dashes:
        fails.append(f"em/en dash in prose x{dashes} (use a full stop)")
    if banned:
        fails.append("banned phrase: " + ", ".join(repr(b) for b in banned))
    if excl >= 2 and excl * per_k > SLOP_MAX_EXCL_PER_K:
        fails.append(f"{excl} '!' ({excl * per_k:.0f} per 1,000 words, at most {SLOP_MAX_EXCL_PER_K})")
    if emoji >= 2 and emoji * per_k > SLOP_MAX_EMOJI_PER_K:
        fails.append(f"{emoji} emoji ({emoji * per_k:.0f} per 1,000 words, at most {SLOP_MAX_EMOJI_PER_K})")
    if rebuttals > SLOP_MAX_REBUTTALS:
        fails.append(f"{rebuttals} 'not X, but Y' rebuttals (at most {SLOP_MAX_REBUTTALS})")
    if colons >= 3 and colons * per_k > SLOP_MAX_COLON_PER_K:
        warns.append(f"mid-sentence colons {colons * per_k:.0f} per 1,000 words (more than {SLOP_MAX_COLON_PER_K})")
    if emoji:
        warns.append(f"emoji in prose x{emoji}")
    return words, fails, warns


def slop_ngrams(sources):
    """Warnings for the same SLOP_NGRAM-word run in SLOP_NGRAM_FILES or more places: a copy-paste
    frame. A ticket's own files (story, hints, quiz, Byte) count as one place: they are meant to
    use the same words for the same thing."""
    seen, place = {}, {}
    for label, prose in sources:
        place[label] = label.rsplit("/", 1)[0] if "/tickets/" in label else label
        words = [w.lower() for w in SLOP_WORD.findall(SLOP_QUOTED.sub(" ", prose)) if w not in ("CODE", "MATH")]
        for i in range(len(words) - SLOP_NGRAM + 1):
            seen.setdefault(" ".join(words[i:i + SLOP_NGRAM]), set()).add(label)
    shared = {g: files for g, files in seen.items() if len({place[f] for f in files}) >= SLOP_NGRAM_FILES}
    warns = {}
    for gram, files in sorted(shared.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        others = len({place[f] for f in files}) - 1
        for label in files:
            warns.setdefault(label, []).append(f"'{gram}' also appears in {others} other places")
    return warns, shared


def slop_headings(content_dir):
    """Warnings for a lesson heading used in more than SLOP_MAX_HEADING_LESSONS lessons: a fixed frame."""
    where = {}
    for path in sorted(Path(content_dir).glob("seasons/*/tickets/*/concept.md")):
        for heading, _, _ in lesson_sections(path.read_text(encoding="utf-8")):
            where.setdefault(heading.strip().rstrip(":.").lower(), []).append(path)
    warns = {}
    for heading, paths in where.items():
        if len(paths) > SLOP_MAX_HEADING_LESSONS:
            for path in paths:
                label = f"content/{path.relative_to(content_dir).as_posix()}"
                warns.setdefault(label, []).append(f"heading '{heading}' is in {len(paths)} lessons")
    return warns


def slop_check(content_dir, chat_file=None):
    """The whole slop check: {label: {"words", "fails", "warns"}} for every file it reads."""
    sources = slop_sources(content_dir, chat_file)
    result = {}
    for label, prose in sources:
        words, fails, warns = slop_file(prose)
        result[label] = {"words": words, "fails": fails, "warns": warns}
    gram_warns, _ = slop_ngrams(sources)
    for extra in (gram_warns, slop_headings(content_dir)):
        for label, warns in extra.items():
            result.setdefault(label, {"words": 0, "fails": [], "warns": []})["warns"].extend(warns)
    return result


def slop_summary(result):
    """(checked, failing, warn-only, clean) over files of at least SLOP_MIN_WORDS words."""
    checked = [r for r in result.values() if r["words"] >= SLOP_MIN_WORDS]
    failing = sum(1 for r in checked if r["fails"])
    warn_only = sum(1 for r in checked if not r["fails"] and r["warns"])
    return len(checked), failing, warn_only, len(checked) - failing - warn_only


def default_chat_file(content_dir):
    chat = Path(content_dir).resolve().parent / "lib" / "game" / "teamChat.ts"
    return chat if chat.is_file() else None


def all_ticket_ids(seasons_root):
    """Every ticket id found in any season's ticket.yaml files."""
    ids = set()
    for ticket_yaml in seasons_root.glob("*/tickets/*/ticket.yaml"):
        try:
            meta = yaml.safe_load(ticket_yaml.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        if isinstance(meta, dict) and isinstance(meta.get("id"), str):
            ids.add(meta["id"])
    return ids


def validate_content(content_dir):
    """Validate every season in folder-name order, chaining the codebase from one
    on-chain season to the next (off-chain seasons are skipped by the chain)."""
    report = {}
    seasons_root = Path(content_dir) / "seasons"
    prev = None
    final_seen = None
    for season_dir in sorted(p for p in seasons_root.iterdir() if p.is_dir()):
        report.update(validate_season(season_dir, prev))
        chain, final = season_flags(season_dir)
        if chain and final_seen:
            report[season_dir.name].append(
                f"on-chain season after the final season {final_seen} (the final exam must come last)")
        if final:
            final_seen = final_seen or season_dir.name
        if not chain:
            continue
        order = season_ticket_order(season_dir)
        last = season_dir / "tickets" / order[-1] if order else None
        prev = last if last is not None and last.is_dir() else None
    for label, errors in check_requires(seasons_root).items():
        report.setdefault(label, []).extend(errors)
    for label, errors in check_season_requires(seasons_root).items():
        report.setdefault(label, []).extend(errors)
    report["byte/why-lengths"] = check_byte_why_lengths(seasons_root)
    warmups_dir = Path(content_dir) / "warmups"
    if warmups_dir.is_dir():
        report["warmups"] = validate_warmups(warmups_dir, all_ticket_ids(seasons_root))
    skills_check = Path(content_dir) / "assessment" / "skills-check.yaml"
    if skills_check.is_file():
        report["assessment/skills-check"] = check_skills_check(skills_check)
    slop = slop_check(content_dir, default_chat_file(content_dir))
    report["slop/check"] = [f"{label}: {fail}" for label, r in sorted(slop.items()) for fail in r["fails"]]
    return report


def print_slop(content_dir, all_warnings=False):
    """The slop check's summary line, warnings per rule, and (with --slop-warnings) every warning."""
    result = slop_check(content_dir, default_chat_file(content_dir))
    checked, failing, warn_only, clean = slop_summary(result)
    print(f"slop check: {checked} files, {failing} fail, {warn_only} warn only, {clean} clean")
    kinds = {}
    for r in result.values():
        for w in r["warns"]:
            kind = ("shared 7-word run" if "also appears in" in w else "repeated lesson heading" if w.startswith("heading")
                    else "mid-sentence colons" if w.startswith("mid-sentence") else "emoji in prose")
            kinds[kind] = kinds.get(kind, 0) + 1
    if kinds:
        print("slop warnings: " + ", ".join(f"{k} x{n}" for k, n in sorted(kinds.items())))
    if all_warnings:
        for label, r in sorted(result.items()):
            for w in r["warns"]:
                print(f"warn {label}: {w}")


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    content_dir = Path(args[0]) if args else REPO_ROOT / "content"
    report = validate_content(content_dir)
    failed = 0
    for label, errors in report.items():
        if errors:
            failed += 1
            print(f"FAIL {label}")
            for e in errors:
                print(f"     - {e}")
        else:
            print(f"ok   {label}")
    print()
    print_slop(content_dir, "--slop-warnings" in argv)
    print(f"{len(report) - failed}/{len(report)} valid")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
