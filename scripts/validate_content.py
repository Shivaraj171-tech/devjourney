"""Validate every season and ticket under content/.

For each ticket it checks:
  1. Required files exist (ticket.yaml, story.md, hints.md, starter/, tests/, solution/).
  2. ticket.yaml has the required fields with allowed values, and every
     file in files_editable exists in starter/.
  3. hints.md has at least one hint (hints are separated by a line "---").
  4. questions.yaml (optional "check your understanding" quiz) is well formed:
     2-4 choices per question, answer is a valid 0-based index, explain present.
  4b. concept.md (optional "Learn" lesson) is non-empty, starts with a
     **Title** line, and every ```python block is valid Python syntax.
  5. The tests FAIL against starter/ (otherwise there is nothing to do).
  6. The tests PASS against solution/.
  7. Evolving codebase: every file in solution(N) appears unchanged in starter(N+1).

Daily warm-ups (content/warmups/*.yaml, optional) are checked too: required
fields, unique ids, `after` names a real ticket id, the code compiles and is
3-10 lines, 2-4 choices and a valid 0-based answer index.

Tickets with `type: read` are different: the questions ARE the task. They need
starter/ (the code to read) and a questions.yaml with at least 3 questions;
tests/ and solution/ are optional and checks 5-6 are skipped. For check 7 the
code is unchanged by a read ticket, so its starter/ counts as its solution.

Usage:
    python3 scripts/validate_content.py [content_dir]

Exits with code 0 if everything is valid, 1 otherwise.
Requires PyYAML.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "lib" / "runner" / "test_runner.py"
TEST_TIMEOUT_SECONDS = 10
MIN_CHOICES, MAX_CHOICES = 2, 4
MIN_READ_QUESTIONS = 3

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
    "track": {"foundations", "building", "debugging", "reading", "systems", "ai"},
}


WARMUP_CONCEPTS = {
    "strings", "numbers", "conditionals", "loops", "lists", "dictionaries",
    "None", "functions", "mutable-shared-data", "reading-code",
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
TITLE_LINE = re.compile(r"^\*\*[^*].*\*\*$")


def check_concept(path):
    """Check a concept.md lesson. Returns a list of error strings."""
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
    return errors


def check_ticket_meta(ticket_dir):
    """Check files, ticket.yaml, hints and questions. Returns a list of error strings."""
    errors = []
    for name in ["ticket.yaml", "story.md", "hints.md"]:
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
    is_read = meta.get("type") == "read"

    folders = ["starter"] if is_read else ["starter", "tests", "solution"]
    for name in folders:
        if not (ticket_dir / name).is_dir():
            errors.append(f"missing {name}/ folder")
    questions_file = ticket_dir / "questions.yaml"
    if is_read and not questions_file.is_file():
        errors.append("missing questions.yaml (required for read tickets)")
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

    if not read_hints(ticket_dir / "hints.md"):
        errors.append("hints.md has no hints")
    if not is_read and not list((ticket_dir / "tests").glob("test_*.py")):
        errors.append("tests/ has no test_*.py files")
    if questions_file.is_file():
        errors += check_questions(questions_file, MIN_READ_QUESTIONS if is_read else 1)
    if (ticket_dir / "concept.md").is_file():
        errors += check_concept(ticket_dir / "concept.md")
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


def check_evolution(prev_dir, next_dir):
    """Every file in solution(prev) must appear unchanged in starter(next).

    A read ticket doesn't change the code, so its starter/ counts as its solution.
    """
    errors = []
    source = "starter" if load_ticket_type(prev_dir) == "read" else "solution"
    prev_files = files_in(prev_dir / source)
    next_files = files_in(next_dir / "starter")
    for rel, path in sorted(prev_files.items()):
        if rel not in next_files:
            errors.append(f"{rel} from {prev_dir.name}/{source} is missing in starter/")
        elif path.read_bytes() != next_files[rel].read_bytes():
            errors.append(f"{rel} differs from {prev_dir.name}/{source}")
    return errors


def validate_season(season_dir):
    """Returns a dict {label: [errors]} for the season and each of its tickets."""
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

    tickets_root = season_dir / "tickets"
    on_disk = {p.name for p in tickets_root.iterdir() if p.is_dir()} if tickets_root.is_dir() else set()
    for name in sorted(on_disk - set(order)):
        season_errors.append(f"ticket folder {name} is not listed in season.yaml")
    report[season_dir.name] = season_errors

    prev = None
    for name in order:
        ticket_dir = tickets_root / name
        label = f"{season_dir.name}/{name}"
        if not ticket_dir.is_dir():
            report[label] = ["listed in season.yaml but folder does not exist"]
            prev = None
            continue
        errors = check_ticket_meta(ticket_dir)
        if not errors and load_ticket_type(ticket_dir) != "read":
            errors += check_ticket_tests(ticket_dir)
        prev_source = "starter" if prev is not None and load_ticket_type(prev) == "read" else "solution"
        if prev is not None and (prev / prev_source).is_dir() and (ticket_dir / "starter").is_dir():
            errors += check_evolution(prev, ticket_dir)
        report[label] = errors
        prev = ticket_dir
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
    report = {}
    seasons_root = Path(content_dir) / "seasons"
    for season_dir in sorted(p for p in seasons_root.iterdir() if p.is_dir()):
        report.update(validate_season(season_dir))
    warmups_dir = Path(content_dir) / "warmups"
    if warmups_dir.is_dir():
        report["warmups"] = validate_warmups(warmups_dir, all_ticket_ids(seasons_root))
    return report


def main(argv):
    content_dir = Path(argv[1]) if len(argv) > 1 else REPO_ROOT / "content"
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
    print(f"{len(report) - failed}/{len(report)} valid")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
