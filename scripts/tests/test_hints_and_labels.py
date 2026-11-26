"""Tests for the validator's "don't give the answer away" checks: hints that contain a solution
line verbatim, and comments naming Byte on the bug line.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import tempfile
import unittest
from pathlib import Path

# Only helpers (not test classes) are imported, so no test runs twice.
from test_runner_and_validator import make_ticket

import validate_content as vc

# make_ticket's starter is "return x + 2", its solution "return x * 2".
NUDGES = "Try double(3) by hand.\n---\nDoubling is multiplying, not adding.\n"


class HintLeakTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def leaks(self, hints, **kw):
        return vc.check_hint_leaks(make_ticket(self.root, "t01", hints=hints, **kw))

    def test_near_answer_is_fine(self):
        hints = NUDGES + "---\nThe `return` line of `double` uses the wrong operator: which one doubles x?\n"
        self.assertEqual(self.leaks(hints), [])

    def test_last_hint_with_the_solution_line_fails(self):
        errors = self.leaks(NUDGES + "---\nChange the line to `return x * 2`.\n")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("hint 3 gives away the solution", errors[0])
        self.assertIn("`return x * 2`", errors[0])
        self.assertIn("solution/app/calc.py", errors[0])

    def test_any_hint_counts_and_spacing_or_backticks_do_not_hide_it(self):
        errors = self.leaks("Write   `return  x * 2` there.\n---\nnothing\n")
        self.assertTrue(any("hint 1" in e for e in errors), errors)

    def test_short_generic_and_already_present_lines_do_not_count(self):
        starter = "def double(x):\n    y = x\n    return x + 2\n"
        solution = "def double(x):\n    y = x\n    return 0\n"
        # `return 0` is too short to be "the answer"; `y = x` is unchanged anyway.
        self.assertEqual(self.leaks("Make it `return 0`.\n", starter_code=starter, solution_code=solution), [])
        # A line the solution adds that already exists elsewhere in starter/ gives nothing away.
        starter = "def double(x):\n    return x + 2\n\n\ndef twice(x):\n    return x * 2\n"
        solution = "def double(x):\n    return x * 2\n\n\ndef twice(x):\n    return x * 2\n"
        self.assertEqual(self.leaks("Copy `return x * 2` from twice.\n", starter_code=starter, solution_code=solution), [])

    def test_comment_and_docstring_lines_do_not_count(self):
        solution = 'def double(x):\n    """Twice x, the long way round."""\n    # multiply, never add\n    return x * 2\n'
        hints = "Read the docstring: Twice x, the long way round. And: # multiply, never add\n"
        self.assertEqual(self.leaks(hints, solution_code=solution), [])

    def test_runs_in_check_ticket_meta(self):
        t = make_ticket(self.root, "t01", hints=NUDGES + "---\n`return x * 2`\n")
        self.assertTrue(any("gives away the solution" in e for e in vc.check_ticket_meta(t)))


class BugLineLabelTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def labels(self, starter, solution=None):
        kw = {"solution_code": solution} if solution is not None else {}
        return vc.check_bug_line_labels(make_ticket(self.root, "t01", starter_code=starter, **kw))

    def test_byte_comment_on_the_bug_line_fails(self):
        errors = self.labels("def double(x):\n    return x + 2  # Byte: adding is doubling\n")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("starter/app/calc.py:2", errors[0])
        self.assertIn("names Byte", errors[0])

    def test_byte_comment_line_inside_the_change_fails(self):
        errors = self.labels("def double(x):\n    # Byte's fix\n    return x + 2\n")
        self.assertTrue(any("starter/app/calc.py:2" in e for e in errors), errors)

    def test_plain_bug_line_and_byte_comments_elsewhere_are_fine(self):
        self.assertEqual(self.labels("def double(x):\n    return x + 2\n"), [])
        self.assertEqual(self.labels("# Written by Byte.\ndef double(x):\n    return x + 2  # the result\n",
                                     "# Written by Byte.\ndef double(x):\n    return x * 2  # the result\n"), [])

    def test_real_content_has_no_labelled_bug_lines_or_leaking_hints(self):
        seasons = vc.REPO_ROOT / "content" / "seasons"
        bad = {}
        for t in sorted(seasons.glob("*/tickets/*")):
            if (t / "solution").is_dir() and (t / "hints.md").is_file():
                errors = vc.check_bug_line_labels(t) + vc.check_hint_leaks(t)
                if errors:
                    bad[f"{t.parents[1].name}/{t.name}"] = errors
        self.assertEqual(bad, {})


if __name__ == "__main__":
    unittest.main()
