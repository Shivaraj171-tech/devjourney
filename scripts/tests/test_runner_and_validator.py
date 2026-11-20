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


def question(prompt="Q?", choices=("a", "b", "c"), answer=1, explain="Because."):
    """One question as YAML text (indented as a list item under 'questions:')."""
    lines = [f"  - prompt: {prompt!r}", "    choices:"]
    lines += [f"      - {c!r}" for c in choices]
    lines += [f"    answer: {answer}", f"    explain: {explain!r}"]
    return "\n".join(lines) + "\n"


def questions_yaml(*qs):
    return "questions:\n" + "".join(qs)


READ_YAML = GOOD_YAML.replace("type: bug", "type: read").replace(
    "files_editable: [app/calc.py]", "files_editable: []")


def make_read_ticket(root, name, code=FIXED, questions=None, with_tests=False):
    """A read ticket: starter/ + questions.yaml, no tests/ or solution/ by default."""
    t = root / name
    write(t / "ticket.yaml", READ_YAML)
    write(t / "story.md", "Read this code.\n")
    write(t / "hints.md", "start with the docstrings\n")
    write(t / "starter" / "app" / "__init__.py", "")
    write(t / "starter" / "app" / "calc.py", code)
    if questions is None:
        questions = questions_yaml(question(), question(), question())
    (t / "questions.yaml").write_text(questions, encoding="utf-8")
    if with_tests:
        write(t / "tests" / "test_calc.py", TEST_FILE)
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

    def test_exit_in_learner_code_is_an_error_not_a_crash(self):
        result = self.run_code("import sys\n\ndef double(x):\n    sys.exit(1)\n")
        self.assertNotIn("error", result)  # runner itself didn't crash
        self.assertEqual({r["status"] for r in result["results"]}, {"error"})
        self.assertIn("SystemExit", result["results"][0]["message"])

    def test_exit_at_import_time_is_reported(self):
        result = self.run_code("raise SystemExit(1)\n")
        self.assertEqual(result["results"][0]["name"], "(import)")

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


class QuestionsTests(TempDirTestCase):
    def check(self, text, min_questions=1):
        path = self.tmp / "questions.yaml"
        path.write_text(text, encoding="utf-8")
        return vc.check_questions(path, min_questions)

    def assert_flagged(self, errors, fragment):
        self.assertTrue(any(fragment in e for e in errors), errors)

    def test_good_questions_have_no_errors(self):
        self.assertEqual(self.check(questions_yaml(question(), question(choices=("x", "y"), answer=0))), [])

    def test_answer_out_of_range_is_flagged(self):
        self.assert_flagged(self.check(questions_yaml(question(answer=3))), "answer 3 is out of range")

    def test_negative_answer_is_flagged(self):
        self.assert_flagged(self.check(questions_yaml(question(answer=-1))), "out of range")

    def test_answer_must_be_a_number(self):
        self.assert_flagged(self.check(questions_yaml(question(answer="'b'"))), "'answer' must be a whole number")
        self.assert_flagged(self.check(questions_yaml(question(answer="true"))), "'answer' must be a whole number")

    def test_too_few_choices_is_flagged(self):
        self.assert_flagged(self.check(questions_yaml(question(choices=("only",), answer=0))), "needs 2-4")

    def test_too_many_choices_is_flagged(self):
        self.assert_flagged(self.check(questions_yaml(question(choices=("a", "b", "c", "d", "e")))), "needs 2-4")

    def test_duplicate_choices_are_flagged(self):
        self.assert_flagged(self.check(questions_yaml(question(choices=("a", "a")))), "must all be different")

    def test_missing_explain_is_flagged(self):
        text = questions_yaml(question()).replace("    explain: 'Because.'\n", "")
        self.assert_flagged(self.check(text), "'explain' is missing or empty")

    def test_empty_prompt_is_flagged(self):
        self.assert_flagged(self.check(questions_yaml(question(prompt=""))), "'prompt' is missing or empty")

    def test_missing_questions_list_is_flagged(self):
        self.assert_flagged(self.check("prompt: hi\n"), "must have a 'questions' list")

    def test_invalid_yaml_is_flagged(self):
        self.assert_flagged(self.check("questions: [\n"), "not valid YAML")

    def test_minimum_number_of_questions(self):
        self.assert_flagged(self.check(questions_yaml(question()), min_questions=3), "at least 3 question(s), has 1")

    def test_questions_are_checked_on_normal_tickets(self):
        t = make_ticket(self.tmp, "t01")
        (t / "questions.yaml").write_text(questions_yaml(question(answer=7)), encoding="utf-8")
        self.assert_flagged(vc.check_ticket_meta(t), "out of range")

    def test_questions_are_optional_on_normal_tickets(self):
        t = make_ticket(self.tmp, "t01")
        self.assertFalse((t / "questions.yaml").exists())
        self.assertEqual(vc.check_ticket_meta(t), [])


class ReadTicketTests(TempDirTestCase):
    def test_read_ticket_without_tests_or_solution_is_valid(self):
        t = make_read_ticket(self.tmp, "t01")
        self.assertEqual(vc.check_ticket_meta(t), [])

    def test_read_ticket_needs_questions_file(self):
        t = make_read_ticket(self.tmp, "t01")
        (t / "questions.yaml").unlink()
        self.assertIn("missing questions.yaml (required for read tickets)", vc.check_ticket_meta(t))

    def test_read_ticket_needs_three_questions(self):
        t = make_read_ticket(self.tmp, "t01", questions=questions_yaml(question(), question()))
        errors = vc.check_ticket_meta(t)
        self.assertTrue(any("at least 3 question(s), has 2" in e for e in errors), errors)

    def test_read_ticket_needs_starter(self):
        t = make_read_ticket(self.tmp, "t01")
        shutil.rmtree(t / "starter")
        self.assertIn("missing starter/ folder", vc.check_ticket_meta(t))

    def test_non_read_ticket_still_needs_tests_and_solution(self):
        t = make_ticket(self.tmp, "t01")
        shutil.rmtree(t / "solution")
        self.assertIn("missing solution/ folder", vc.check_ticket_meta(t))

    def test_season_skips_test_runs_for_read_ticket(self):
        # The read ticket's starter would "already pass" its tests; that's fine for a read ticket.
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        make_read_ticket(season / "tickets", "t01", with_tests=True)
        self.assertEqual(vc.validate_content(self.tmp)["s99/t01"], [])

    def test_read_ticket_starter_counts_as_its_solution(self):
        t1 = make_read_ticket(self.tmp, "t01", code=BUGGY)
        t2 = make_ticket(self.tmp, "t02")  # starter has BUGGY calc.py, unchanged from t01
        self.assertEqual(vc.check_evolution(t1, t2), [])

    def test_changing_code_after_read_ticket_is_flagged(self):
        t1 = make_read_ticket(self.tmp, "t01", code=BUGGY)
        t2 = make_ticket(self.tmp, "t02", starter_code=FIXED)
        self.assertEqual(vc.check_evolution(t1, t2), ["app/calc.py differs from t01/starter"])

    def test_season_with_read_ticket_in_the_middle(self):
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01, t02, t03]\n")
        tickets = season / "tickets"
        make_ticket(tickets, "t01", starter_code=BUGGY, solution_code=FIXED)
        make_read_ticket(tickets, "t02", code=FIXED)
        make_ticket(tickets, "t03", starter_code=FIXED,
                    extra_starter={"app/more.py": "Y = 2\n"})
        # t03's starter must not "already pass", so give it its own failing test.
        write(tickets / "t03" / "tests" / "test_more.py",
              "from app.more import Y\n\ndef test_y():\n    assert Y == 3, f'got {Y}'\n")
        write(tickets / "t03" / "solution" / "app" / "more.py", "Y = 3\n")
        report = vc.validate_content(self.tmp)
        self.assertEqual({k: v for k, v in report.items() if v}, {})


class ConceptTests(TempDirTestCase):
    def check(self, text):
        path = self.tmp / "concept.md"
        path.write_text(text, encoding="utf-8")
        return vc.check_concept(path)

    def test_good_concept_has_no_errors(self):
        text = "**Loops**\n\nA loop repeats.\n\n```python\nfor i in range(2):\n    print(i)  # 0, 1\n```\n\n**Watch out:** off by one.\n"
        self.assertEqual(self.check(text), [])

    def test_empty_concept_is_flagged(self):
        self.assertEqual(self.check("  \n\n"), ["concept.md is empty"])

    def test_missing_title_line_is_flagged(self):
        errors = self.check("# Loops\n\nA loop repeats.\n")
        self.assertTrue(any("must start with a **Title** line" in e for e in errors), errors)

    def test_bold_inside_a_sentence_is_not_a_title(self):
        errors = self.check("Loops are **great** things.\n")
        self.assertTrue(any("**Title**" in e for e in errors), errors)

    def test_python_syntax_error_is_flagged(self):
        errors = self.check("**Loops**\n\n```python\nfor i in range(2)\n    print(i)\n```\n")
        self.assertTrue(any("python block 1 has a syntax error" in e for e in errors), errors)

    def test_only_python_blocks_are_compiled(self):
        self.assertEqual(self.check("**Loops**\n\n```\nthis is not python (\n```\n"), [])

    def test_second_block_is_checked_too(self):
        text = "**X**\n\n```python\nx = 1\n```\n\n```python\nx = = 2\n```\n"
        errors = self.check(text)
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("python block 2", errors[0])

    def test_concept_is_checked_on_tickets(self):
        t = make_ticket(self.tmp, "t01")
        (t / "concept.md").write_text("no title here\n", encoding="utf-8")
        self.assertTrue(any("concept.md" in e for e in vc.check_ticket_meta(t)))

    def test_concept_is_optional(self):
        t = make_ticket(self.tmp, "t01")
        self.assertEqual(vc.check_ticket_meta(t), [])


GOOD_WARMUP = """\
id: w001
title: "Spot the off-by-one"
concept: loops
after: s99-t01
code: |
  def total(prices):
      result = 0
      for i in range(1, len(prices)):
          result += prices[i]
      return result
question: "What does total([5, 10, 20]) return?"
choices: ["35", "30", "15", "It crashes"]
answer: 1
explain: "range(1, ...) skips index 0."
"""


class WarmupTests(TempDirTestCase):
    IDS = {"s99-t01"}

    def check(self, text, name="w001.yaml"):
        path = self.tmp / name
        path.write_text(text, encoding="utf-8")
        return vc.check_warmup(path, self.IDS)[1]

    def assert_flagged(self, errors, fragment):
        self.assertTrue(any(fragment in e for e in errors), errors)

    def test_good_warmup_has_no_errors(self):
        self.assertEqual(self.check(GOOD_WARMUP), [])

    def test_missing_field_is_flagged(self):
        self.assert_flagged(self.check(GOOD_WARMUP.replace('explain: "range(1, ...) skips index 0."\n', "")),
                            "'explain' is missing or empty")

    def test_unknown_after_ticket_is_flagged(self):
        self.assert_flagged(self.check(GOOD_WARMUP.replace("after: s99-t01", "after: s99-t42")),
                            "after 's99-t42' is not a ticket id")

    def test_unknown_concept_is_flagged(self):
        self.assert_flagged(self.check(GOOD_WARMUP.replace("concept: loops", "concept: recursion")),
                            "concept 'recursion'")

    def test_season_two_concepts_are_allowed(self):
        for concept in ["code-review", "side-effects", "tracebacks", "boolean-logic", "reviewing-diffs"]:
            self.assertEqual(self.check(GOOD_WARMUP.replace("concept: loops", f"concept: {concept}")), [], concept)

    def test_season_three_concepts_are_allowed(self):
        for concept in ["classes", "json", "writing-tests", "security", "performance", "refactoring"]:
            self.assertEqual(self.check(GOOD_WARMUP.replace("concept: loops", f"concept: {concept}")), [], concept)

    def test_season_four_concepts_are_allowed(self):
        for concept in ["verifying-ai-claims", "test-first-verification", "hallucinated-apis",
                        "regressions", "specs-and-context"]:
            self.assertEqual(self.check(GOOD_WARMUP.replace("concept: loops", f"concept: {concept}")), [], concept)

    def test_code_syntax_error_is_flagged(self):
        self.assert_flagged(self.check(GOOD_WARMUP.replace("def total(prices):", "def total(prices)")),
                            "syntax error")

    def test_code_too_short_is_flagged(self):
        text = GOOD_WARMUP.replace(
            "  def total(prices):\n      result = 0\n      for i in range(1, len(prices)):\n"
            "          result += prices[i]\n      return result\n", "  x = 1\n")
        self.assert_flagged(self.check(text), "code has 1 lines")

    def test_answer_out_of_range_is_flagged(self):
        self.assert_flagged(self.check(GOOD_WARMUP.replace("answer: 1", "answer: 4")), "out of range")

    def test_too_many_choices_is_flagged(self):
        text = GOOD_WARMUP.replace('"It crashes"]', '"It crashes", "0"]')
        self.assert_flagged(self.check(text), "needs 2-4")

    def test_id_must_match_file_name(self):
        self.assert_flagged(self.check(GOOD_WARMUP, name="w002.yaml"), "should match the file name")

    def test_duplicate_ids_are_flagged(self):
        d = self.tmp / "warmups"
        d.mkdir()
        (d / "w001.yaml").write_text(GOOD_WARMUP, encoding="utf-8")
        (d / "w002.yaml").write_text(GOOD_WARMUP, encoding="utf-8")
        errors = vc.validate_warmups(d, self.IDS)
        self.assertIn("w002.yaml: id 'w001' is also used by w001.yaml", errors)

    def test_warmups_are_part_of_content_validation(self):
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        make_ticket(season / "tickets", "t01")
        (self.tmp / "warmups").mkdir()
        (self.tmp / "warmups" / "w001.yaml").write_text(GOOD_WARMUP, encoding="utf-8")
        self.assertEqual(vc.validate_content(self.tmp)["warmups"], [])

    def test_warmups_folder_is_optional(self):
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        make_ticket(season / "tickets", "t01")
        self.assertNotIn("warmups", vc.validate_content(self.tmp))


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
