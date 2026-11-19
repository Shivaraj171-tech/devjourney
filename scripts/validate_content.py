"""Validate every season and ticket under content/.

For each ticket it checks:
  1. Required files exist (ticket.yaml, story.md, hints.md, starter/, tests/, solution/).
  2. ticket.yaml has the required fields with allowed values, and every
     file in files_editable exists in starter/.
  3. hints.md has at least one hint (hints are separated by a line "---").
  4. The tests FAIL against starter/ (otherwise there is nothing to do).
  5. The tests PASS against solution/.
  6. Evolving codebase: every file in solution(N) appears unchanged in starter(N+1).

Usage:
    python3 scripts/validate_content.py [content_dir]

Exits with code 0 if everything is valid, 1 otherwise.
Requires PyYAML.
"""

import json
import subprocess
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "lib" / "runner" / "test_runner.py"
TEST_TIMEOUT_SECONDS = 10

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


def check_ticket_meta(ticket_dir):
    """Check files and ticket.yaml. Returns a list of error strings."""
    errors = []
    for name in ["ticket.yaml", "story.md", "hints.md"]:
        if not (ticket_dir / name).is_file():
            errors.append(f"missing {name}")
    for name in ["starter", "tests", "solution"]:
        if not (ticket_dir / name).is_dir():
            errors.append(f"missing {name}/ folder")
    if errors:
        return errors

    try:
        meta = yaml.safe_load((ticket_dir / "ticket.yaml").read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"ticket.yaml is not valid YAML: {exc}"]
    if not isinstance(meta, dict):
        return ["ticket.yaml must be a mapping of fields"]

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
    if not list((ticket_dir / "tests").glob("test_*.py")):
        errors.append("tests/ has no test_*.py files")
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
    """Every file in solution(prev) must appear unchanged in starter(next)."""
    errors = []
    prev_files = files_in(prev_dir / "solution")
    next_files = files_in(next_dir / "starter")
    for rel, path in sorted(prev_files.items()):
        if rel not in next_files:
            errors.append(f"{rel} from {prev_dir.name}/solution is missing in starter/")
        elif path.read_bytes() != next_files[rel].read_bytes():
            errors.append(f"{rel} differs from {prev_dir.name}/solution")
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
        if not errors:
            errors += check_ticket_tests(ticket_dir)
        if prev is not None and (prev / "solution").is_dir() and (ticket_dir / "starter").is_dir():
            errors += check_evolution(prev, ticket_dir)
        report[label] = errors
        prev = ticket_dir
    return report


def validate_content(content_dir):
    report = {}
    seasons_root = Path(content_dir) / "seasons"
    for season_dir in sorted(p for p in seasons_root.iterdir() if p.is_dir()):
        report.update(validate_season(season_dir))
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
