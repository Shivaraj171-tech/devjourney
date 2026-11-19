"""Tests for review and incident tickets, and for the evolving codebase across seasons.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import tempfile
import unittest
from pathlib import Path

# Only helpers (not test classes) are imported, so no test runs twice.
from test_runner_and_validator import BUGGY, FIXED, GOOD_YAML, make_ticket, write

import validate_content as vc

REVIEW_TICKET_YAML = GOOD_YAML.replace("type: bug", "type: review").replace(
    "files_editable: [app/calc.py]", "files_editable: []")

PR_CODE = """\
    def double(x):
        return x + x


    def triple(x):
        return x * 4
"""

REVIEW_YAML = """\
    title: "Add triple()"
    author: "Byte"
    description: "Adds triple."
    files: [app/calc.py]
    issues:
      - file: app/calc.py
        line: 6
        explain: "4 is not 3."
"""


def make_review_ticket(root, name, code=FIXED, pr_code=PR_CODE, review_yaml=REVIEW_YAML, extra_pr=None):
    """A review ticket: starter/ + pr/ + review.yaml, no tests/ or solution/."""
    t = root / name
    write(t / "ticket.yaml", REVIEW_TICKET_YAML)
    write(t / "story.md", "Review this PR.\n")
    write(t / "hints.md", "read every line\n")
    write(t / "starter" / "app" / "__init__.py", "")
    write(t / "starter" / "app" / "calc.py", code)
    write(t / "pr" / "app" / "calc.py", pr_code)
    for rel, text in (extra_pr or {}).items():
        write(t / "pr" / rel, text)
    write(t / "review.yaml", review_yaml)
    return t


def make_incident_ticket(root, name, logs="ERROR something broke\n", extra_yaml=""):
    t = make_ticket(root, name, yaml_text=GOOD_YAML.replace("type: bug", "type: incident") + extra_yaml)
    if logs is not None:
        (t / "logs.txt").write_text(logs, encoding="utf-8")
    return t


class TempDirTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def assert_flagged(self, errors, fragment):
        self.assertTrue(any(fragment in e for e in errors), errors)


class ReviewTicketTests(TempDirTestCase):
    def test_good_review_ticket_is_valid(self):
        t = make_review_ticket(self.tmp, "t01")
        self.assertEqual(vc.check_ticket_meta(t), [])

    def test_review_needs_review_yaml_and_pr_folder(self):
        t = make_review_ticket(self.tmp, "t01")
        (t / "review.yaml").unlink()
        shutil.rmtree(t / "pr")
        errors = vc.check_ticket_meta(t)
        self.assertIn("missing pr/ folder", errors)
        self.assertIn("missing review.yaml (required for review tickets)", errors)

    def test_issue_line_outside_file_is_flagged(self):
        t = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML.replace("line: 6", "line: 60"))
        self.assert_flagged(vc.check_ticket_meta(t), "line 60 is outside app/calc.py (1-6)")

    def test_issue_on_blank_line_is_flagged(self):
        t = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML.replace("line: 6", "line: 3"))
        self.assert_flagged(vc.check_ticket_meta(t), "line 3 of app/calc.py is blank")

    def test_issue_in_unknown_file_is_flagged(self):
        yaml_text = REVIEW_YAML.replace("      - file: app/calc.py", "      - file: app/nope.py")
        t = make_review_ticket(self.tmp, "t01", review_yaml=yaml_text)
        self.assert_flagged(vc.check_ticket_meta(t), "file 'app/nope.py' is not one of the PR files")

    def test_also_lines_are_checked(self):
        yaml_text = REVIEW_YAML.replace("        line: 6\n", "        line: 6\n        also_lines: [5, 99]\n")
        t = make_review_ticket(self.tmp, "t01", review_yaml=yaml_text)
        errors = vc.check_ticket_meta(t)
        self.assert_flagged(errors, "line 99 is outside")
        self.assertFalse(any("line 5" in e for e in errors), errors)

    def test_two_issues_on_the_same_line_are_flagged(self):
        yaml_text = REVIEW_YAML + '      - file: app/calc.py\n        line: 6\n        explain: "again"\n'
        t = make_review_ticket(self.tmp, "t01", review_yaml=yaml_text)
        self.assert_flagged(vc.check_ticket_meta(t), "app/calc.py:6 is already used by issue 1")

    def test_review_needs_at_least_one_issue(self):
        yaml_text = REVIEW_YAML.split("    issues:")[0] + "    issues: []\n"
        t = make_review_ticket(self.tmp, "t01", review_yaml=yaml_text)
        self.assert_flagged(vc.check_ticket_meta(t), "'issues' must be a non-empty list")

    def test_listed_file_missing_from_pr_is_flagged(self):
        t = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML.replace("[app/calc.py]", "[app/calc.py, app/gone.py]"))
        self.assert_flagged(vc.check_ticket_meta(t), "file app/gone.py does not exist in pr/")

    def test_unlisted_pr_file_is_flagged(self):
        t = make_review_ticket(self.tmp, "t01", extra_pr={"app/extra.py": "X = 1\n"})
        self.assert_flagged(vc.check_ticket_meta(t), "pr/app/extra.py is not listed")

    def test_pr_file_must_be_valid_python(self):
        t = make_review_ticket(self.tmp, "t01", pr_code=PR_CODE.replace("def triple(x):", "def triple(x)"))
        self.assert_flagged(vc.check_ticket_meta(t), "pr/app/calc.py is not valid Python: line 5")

    def test_pr_must_change_the_file(self):
        t = make_review_ticket(self.tmp, "t01", code=PR_CODE)
        self.assert_flagged(vc.check_ticket_meta(t), "identical to starter/app/calc.py")

    def test_missing_pr_title_is_flagged(self):
        t = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML.replace('    title: "Add triple()"\n', ""))
        self.assert_flagged(vc.check_ticket_meta(t), "'title' is missing or empty")

    def test_merged_must_be_a_boolean(self):
        t = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML + "    merged: yes please\n")
        self.assert_flagged(vc.check_ticket_meta(t), "'merged' must be true or false")

    def test_season_skips_test_runs_for_review_ticket(self):
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        make_review_ticket(season / "tickets", "t01")
        self.assertEqual(vc.validate_content(self.tmp)["s99/t01"], [])


class ReviewEvolutionTests(TempDirTestCase):
    def test_unmerged_review_leaves_starter_unchanged(self):
        t1 = make_review_ticket(self.tmp, "t01", code=BUGGY)
        t2 = make_ticket(self.tmp, "t02", starter_code=BUGGY)
        self.assertEqual(vc.check_evolution(t1, t2), [])

    def test_merged_review_carries_the_pr_forward(self):
        t1 = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML + "    merged: true\n")
        t2 = make_ticket(self.tmp, "t02", starter_code=PR_CODE)
        self.assertEqual(vc.check_evolution(t1, t2), [])

    def test_merged_review_without_the_pr_in_next_starter_is_flagged(self):
        t1 = make_review_ticket(self.tmp, "t01", review_yaml=REVIEW_YAML + "    merged: true\n")
        t2 = make_ticket(self.tmp, "t02", starter_code=FIXED)
        self.assertEqual(vc.check_evolution(t1, t2), ["app/calc.py differs from t01/starter+pr"])


class IncidentTicketTests(TempDirTestCase):
    def test_good_incident_is_valid(self):
        t = make_incident_ticket(self.tmp, "t01", extra_yaml="    time_limit_minutes: 15\n")
        self.assertEqual(vc.check_ticket_meta(t), [])
        self.assertEqual(vc.check_ticket_tests(t), [])

    def test_incident_needs_logs(self):
        t = make_incident_ticket(self.tmp, "t01", logs=None)
        self.assertIn("missing logs.txt (required for incident tickets)", vc.check_ticket_meta(t))

    def test_empty_logs_are_flagged(self):
        t = make_incident_ticket(self.tmp, "t01", logs="\n  \n")
        self.assertIn("logs.txt is empty", vc.check_ticket_meta(t))

    def test_bad_time_limit_is_flagged(self):
        for bad in ["0", "61", "'15'", "true"]:
            t = make_incident_ticket(self.tmp, f"t-{bad.strip(chr(39))}", extra_yaml=f"    time_limit_minutes: {bad}\n")
            self.assert_flagged(vc.check_ticket_meta(t), "'time_limit_minutes' must be a whole number from 1 to 60")

    def test_incident_still_needs_tests_and_solution(self):
        t = make_incident_ticket(self.tmp, "t01")
        shutil.rmtree(t / "solution")
        self.assertIn("missing solution/ folder", vc.check_ticket_meta(t))


class CrossSeasonTests(TempDirTestCase):
    def make_two_seasons(self, s2_starter):
        root = self.tmp / "seasons"
        write(root / "s01" / "season.yaml", "id: s01\ntitle: A\nintro: I\ntickets: [t01]\n")
        make_ticket(root / "s01" / "tickets", "t01", starter_code=BUGGY, solution_code=FIXED)
        write(root / "s02" / "season.yaml", "id: s02\ntitle: B\nintro: I\ntickets: [t01]\n")
        t = make_ticket(root / "s02" / "tickets", "t01", starter_code=s2_starter,
                        extra_starter={"app/more.py": "Y = 2\n"})
        write(t / "tests" / "test_more.py", "from app.more import Y\n\ndef test_y():\n    assert Y == 3\n")
        write(t / "solution" / "app" / "calc.py", s2_starter)
        write(t / "solution" / "app" / "more.py", "Y = 3\n")
        return vc.validate_content(self.tmp)

    def test_next_season_continues_from_last_solution(self):
        report = self.make_two_seasons(s2_starter=FIXED)
        self.assertEqual({k: v for k, v in report.items() if v}, {})

    def test_next_season_that_drifts_is_flagged(self):
        report = self.make_two_seasons(s2_starter=BUGGY)
        self.assertIn("app/calc.py differs from t01/solution", report["s02/t01"])


class RealContentTests(unittest.TestCase):
    def test_season_two_follows_season_one(self):
        root = vc.REPO_ROOT / "content" / "seasons"
        s1_last = vc.files_in(root / "s01-first-week" / "tickets" / "t10-leaky-orders" / "solution")
        s2_first = vc.files_in(root / "s02-week-two" / "tickets" / "t01-byte-tips" / "starter")
        for rel, path in s1_last.items():
            self.assertEqual(path.read_bytes(), s2_first[rel].read_bytes(), rel)


if __name__ == "__main__":
    unittest.main()
