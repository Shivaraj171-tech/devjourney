"""Tests for lib/runner/test_runner.py and scripts/validate_content.py.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import validate_content as vc  # noqa: E402


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(text), encoding="utf-8")


GOOD_YAML = """\
    id: s99-t01
    title: "Test ticket"
    type: bug
    level: intern
    track: foundations
    concepts: [numbers]
    new_concept: numbers
    estimated_minutes: 10
    tests_visible: true
    files_editable: [app/calc.py]
"""
TEST_FILE = """\
    from app.calc import double

    def test_double_two():
        assert double(2) == 4, f"got {double(2)}"

    def test_double_zero():
        assert double(0) == 0
"""
BUGGY = "def double(x):\n    return x + 2\n"
FIXED = "def double(x):\n    return x * 2\n"


def make_ticket(root, name, starter_code=BUGGY, solution_code=FIXED, yaml_text=GOOD_YAML,
                hints="nudge\n---\ndirection\n", extra_starter=None):
    t = root / name
    write(t / "ticket.yaml", yaml_text)
    write(t / "story.md", "A story.\n")
    write(t / "hints.md", hints)
    write(t / "tests" / "test_calc.py", TEST_FILE)
    write(t / "starter" / "app" / "__init__.py", "")
    write(t / "starter" / "app" / "calc.py", starter_code)
    write(t / "solution" / "app" / "__init__.py", "")
    write(t / "solution" / "app" / "calc.py", solution_code)
    for rel, text in (extra_starter or {}).items():
        write(t / "starter" / rel, text)
    return t


class TempDirTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.tmp)


class RunnerTests(TempDirTestCase):
    def run_code(self, code, tests=TEST_FILE):
        write(self.tmp / "code" / "app" / "__init__.py", "")
        write(self.tmp / "code" / "app" / "calc.py", code)
        write(self.tmp / "tests" / "test_calc.py", tests)
        return vc.run_ticket_tests(self.tmp / "code", self.tmp / "tests")

    def test_all_pass(self):
        result = self.run_code(FIXED)
        self.assertTrue(result["passed"])
        self.assertEqual([r["status"] for r in result["results"]], ["pass", "pass"])

    def test_tests_run_in_definition_order(self):
        result = self.run_code(FIXED)
        self.assertEqual([r["name"] for r in result["results"]],
                         ["test_double_two", "test_double_zero"])

    def test_failing_assert_reports_message(self):
        # With the bug, double(2) is 2 + 2 == 4, so test_double_two passes by accident;
        # test_double_zero catches it (0 + 2 != 0).
        result = self.run_code(BUGGY)
        self.assertFalse(result["passed"])
        statuses = {r["name"]: r["status"] for r in result["results"]}
        self.assertEqual(statuses, {"test_double_two": "pass", "test_double_zero": "fail"})

    def test_assert_message_is_reported(self):
        result = self.run_code("def double(x):\n    return 5\n")
        first = result["results"][0]
        self.assertEqual(first["status"], "fail")
        self.assertEqual(first["message"], "got 5")

    def test_exception_is_error_not_fail(self):
        result = self.run_code("def double(x):\n    return x.nope\n")
        self.assertEqual({r["status"] for r in result["results"]}, {"error"})
        self.assertIn("AttributeError", result["results"][0]["message"])

    def test_syntax_error_in_learner_code_is_import_error(self):
        result = self.run_code("def double(x)\n    return x\n")
        self.assertFalse(result["passed"])
        self.assertEqual(result["results"][0]["name"], "(import)")
        self.assertIn("SyntaxError", result["results"][0]["message"])

    def test_print_output_is_captured_per_test(self):
        result = self.run_code("def double(x):\n    print('debug', x)\n    return x * 2\n")
        self.assertTrue(result["passed"])
        self.assertEqual(result["results"][0]["output"], "debug 2\n")

    def test_infinite_loop_times_out(self):
        old = vc.TEST_TIMEOUT_SECONDS
        vc.TEST_TIMEOUT_SECONDS = 1
        try:
            result = self.run_code("def double(x):\n    while True:\n        pass\n")
        finally:
            vc.TEST_TIMEOUT_SECONDS = old
        self.assertFalse(result["passed"])
        self.assertIn("timed out", result["error"])

    def test_no_tests_is_not_a_pass(self):
        result = self.run_code(FIXED, tests="x = 1\n")
        self.assertFalse(result["passed"])


class TicketValidationTests(TempDirTestCase):
    def test_good_ticket_has_no_errors(self):
        t = make_ticket(self.tmp, "t01")
        self.assertEqual(vc.check_ticket_meta(t), [])
        self.assertEqual(vc.check_ticket_tests(t), [])

    def test_starter_that_already_passes_is_flagged(self):
        t = make_ticket(self.tmp, "t01", starter_code=FIXED)
        errors = vc.check_ticket_tests(t)
        self.assertTrue(any("already passes" in e for e in errors), errors)

    def test_failing_solution_is_flagged(self):
        t = make_ticket(self.tmp, "t01", solution_code=BUGGY)
        errors = vc.check_ticket_tests(t)
        self.assertTrue(any("solution/ fails" in e for e in errors), errors)

    def test_bad_enum_value_is_flagged(self):
        t = make_ticket(self.tmp, "t01", yaml_text=GOOD_YAML.replace("type: bug", "type: puzzle"))
        errors = vc.check_ticket_meta(t)
        self.assertTrue(any("'type' is 'puzzle'" in e for e in errors), errors)

    def test_missing_field_is_flagged(self):
        yaml_text = GOOD_YAML.replace("    new_concept: numbers\n", "")
        t = make_ticket(self.tmp, "t01", yaml_text=yaml_text)
        self.assertIn("ticket.yaml: missing field 'new_concept'", vc.check_ticket_meta(t))

    def test_editable_file_must_exist(self):
        yaml_text = GOOD_YAML.replace("app/calc.py", "app/missing.py")
        t = make_ticket(self.tmp, "t01", yaml_text=yaml_text)
        errors = vc.check_ticket_meta(t)
        self.assertTrue(any("app/missing.py" in e for e in errors), errors)

    def test_empty_hints_are_flagged(self):
        t = make_ticket(self.tmp, "t01", hints="\n---\n\n")
        self.assertIn("hints.md has no hints", vc.check_ticket_meta(t))

    def test_read_hints_splits_on_separator(self):
        write(self.tmp / "hints.md", "one\n---\ntwo\nlines\n---\nthree\n")
        self.assertEqual(vc.read_hints(self.tmp / "hints.md"), ["one", "two\nlines", "three"])


class EvolutionTests(TempDirTestCase):
    def test_next_starter_built_from_previous_solution_is_ok(self):
        t1 = make_ticket(self.tmp, "t01")
        t2 = make_ticket(self.tmp, "t02", starter_code=FIXED,
                         extra_starter={"app/new.py": "X = 1\n"})
        self.assertEqual(vc.check_evolution(t1, t2), [])

    def test_changed_file_is_flagged(self):
        t1 = make_ticket(self.tmp, "t01")
        t2 = make_ticket(self.tmp, "t02", starter_code=BUGGY)
        errors = vc.check_evolution(t1, t2)
        self.assertEqual(errors, ["app/calc.py differs from t01/solution"])


class SeasonValidationTests(TempDirTestCase):
    def test_unlisted_ticket_folder_is_flagged(self):
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        make_ticket(season / "tickets", "t01")
        make_ticket(season / "tickets", "t02")
        report = vc.validate_content(self.tmp)
        self.assertEqual(report["s99/t01"], [])
        self.assertIn("ticket folder t02 is not listed in season.yaml", report["s99"])

    def test_real_content_is_valid(self):
        report = vc.validate_content(REPO_ROOT / "content")
        bad = {k: v for k, v in report.items() if v}
        self.assertEqual(bad, {})


if __name__ == "__main__":
    unittest.main()
