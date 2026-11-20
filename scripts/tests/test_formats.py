"""Tests for formats.yaml (predict / break_it / parsons), byte.yaml `why`, and lib/runner/formats.py.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

# Only helpers (not test classes) are imported, so no test runs twice.
from test_runner_and_validator import make_ticket, write

import validate_content as vc

sys.path.insert(0, str(vc.REPO_ROOT / "lib" / "runner"))
import formats  # noqa: E402  (lib/runner/formats.py, the code the browser runs too)

PREDICT = """\
predict:
  - code: |
      print(1000 // 3)
      print(7 / 2)
    question: "What does this print?"
    answer: |
      333
      3.5
    choices: ["333\\n3.5", "333.3\\n3.5", "333\\n3"]
    explain: "// rounds down."
"""

BREAK_IT = """\
break_it:
  - says: "Works for 900, 3!"
    code: |
      def split_bill(total_cents, people):
          share = total_cents // people
          return [share] * people
    spec: "Shares add up exactly; no two differ by more than 1."
    call: "split_bill({input})"
    input_hint: "total_cents, people"
    helpers: |
      def spec_ok(total_cents, people, shares):
          return len(shares) == people and sum(shares) == total_cents and max(shares) - min(shares) <= 1
    check: "spec_ok({input}, result)"
    normal_input: "900, 3"
    example_input: "1000, 3"
    explain: "// drops the leftover cents."
"""

PARSONS = """\
parsons:
  - goal: "Late orders are the ones over 45 minutes."
    lines:
      - "def late_orders(deliveries):"
      - "    late = []"
      - "    for order_id, minutes in deliveries:"
      - "        if minutes > 45:"
      - "            late.append(order_id)"
      - "    return late"
    distractors:
      - line: "        if minutes >= 45:"
        replaces: 3
        explain: "45 is on time."
    check: |
      assert late_orders([(1001, 50), (1002, 45), (1003, 46)]) == [1001, 1003]
      assert late_orders([]) == []
"""


class FormatsRunnerTests(unittest.TestCase):
    """lib/runner/formats.py on its own (the browser and the validator both use it)."""

    def test_run_snippet_captures_output_and_errors(self):
        self.assertEqual(formats.run_snippet("print('hi')\nprint(1 + 1)")["stdout"], "hi\n2\n")
        result = formats.run_snippet("print('a')\n1 / 0")
        self.assertEqual(result["stdout"], "a\n")
        self.assertEqual(result["error_type"], "ZeroDivisionError")
        self.assertIn("division by zero", result["error"])
        self.assertEqual(formats.run_snippet("print(")["error_type"], "SyntaxError")
        # Every run starts from a fresh namespace.
        formats.run_snippet("leak = 1")
        self.assertEqual(formats.run_snippet("print(leak)")["error_type"], "NameError")

    def test_parse_args_only_accepts_literals(self):
        self.assertEqual(formats.parse_args("1000, 3"), (1000, 3))
        self.assertEqual(formats.parse_args('"  Ana"'), ("  Ana",))
        self.assertEqual(formats.parse_args("[(1, 2)]"), ([(1, 2)],))
        for bad in ["", "   ", "__import__('os')", "1000, 3)", "x"]:
            with self.assertRaises(ValueError):
                formats.parse_args(bad)

    def split_bill(self, text, **kw):
        code = "def split_bill(total, people):\n    return [total // people] * people\n"
        helpers = "def ok(total, people, shares):\n    return sum(shares) == total\n"
        return formats.break_it(code, "split_bill({input})", "ok({input}, result)", text, helpers, **kw)

    def test_break_it_statuses(self):
        self.assertEqual(self.split_bill("900, 3")["status"], "holds")
        broken = self.split_bill("1000, 3")
        self.assertEqual(broken["status"], "broken")
        self.assertEqual(broken["result"], "[333, 333, 333]")
        self.assertEqual(self.split_bill("1000; 3")["status"], "invalid")
        # A crash in Byte's code only counts when the task says so.
        self.assertEqual(self.split_bill("1000, 0")["status"], "crashed")
        self.assertEqual(self.split_bill("1000, 0", crash_counts=True)["status"], "broken")
        # The spec check failing to judge an input is "invalid", not a win.
        code = "def half(x):\n    return x // 2\n"
        self.assertEqual(formats.break_it(code, "half({input})", "result * 2 <= {input}", "[4]")["status"], "crashed")
        self.assertEqual(formats.break_it(code, "half({input})", "len(result) == 0", "4")["status"], "invalid")

    def test_break_it_check_sees_the_original_input(self):
        code = "def clear(xs):\n    xs.clear()\n    return 0\n"
        result = formats.break_it(code, "clear({input})", "result == len({input})", "[]")
        self.assertEqual(result["status"], "holds")
        # Byte's function emptied the list, but the check gets a fresh copy: 0 != 2.
        result = formats.break_it(code, "clear({input})", "result == len({input})", "[1, 2]")
        self.assertEqual(result["status"], "broken")

    def test_parsons(self):
        program = "def f(x):\n    return x * 2"
        self.assertTrue(formats.parsons(program, "assert f(2) == 4")["passed"])
        failed = formats.parsons(program, "assert f(2) == 5, 'nope'")
        self.assertFalse(failed["passed"])
        self.assertEqual(failed["error"], "AssertionError: nope")
        self.assertEqual(formats.parsons("def f(x):\nreturn x", "")["error_type"], "SyntaxError")
        self.assertTrue(formats.parsons("print('hi ')", "", expected_output="hi\n")["passed"])
        self.assertFalse(formats.parsons("print('ho')", "", expected_output="hi")["passed"])

    def test_handle_json(self):
        import json
        out = json.loads(formats.handle_json(json.dumps({"kind": "predict", "code": "print(3)"})))
        self.assertEqual(out["stdout"], "3\n")
        self.assertIn("unknown kind", json.loads(formats.handle_json('{"kind": "nope"}'))["error"])


class FormatsYamlTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def ticket(self, formats_text):
        t = make_ticket(self.root, f"t{len(list(self.root.iterdir())) + 1:02d}")
        write(t / "formats.yaml", formats_text)
        return t

    def errors(self, formats_text):
        return vc.check_ticket_meta(self.ticket(formats_text))

    def test_valid_formats(self):
        self.assertEqual(self.errors(PREDICT + BREAK_IT + PARSONS), [])

    def test_formats_need_a_known_section(self):
        self.assertTrue(any("unknown section" in e for e in self.errors("quiz: []\n")))
        self.assertTrue(any("at least one" in e for e in self.errors("{}\n")))
        self.assertTrue(any("non-empty list" in e for e in self.errors("predict: []\n")))
        self.assertTrue(any("not valid YAML" in e for e in self.errors("predict: [\n")))

    # ---- predict ----

    def test_predict_answer_must_match_the_real_output(self):
        errors = self.errors(PREDICT.replace("      333\n      3.5", "      333\n      3"))
        self.assertTrue(any("answer" in e and "really prints" in e for e in errors), errors)

    def test_predict_answer_must_be_one_of_the_choices(self):
        errors = self.errors(PREDICT.replace('"333\\n3.5", ', ""))
        self.assertTrue(any("exactly one choice" in e for e in errors), errors)
        errors = self.errors(PREDICT.replace('"333\\n3"]', '"333\\n3.5 "]'))
        self.assertTrue(any("all be different" in e for e in errors), errors)

    def test_predict_choices_are_optional_and_code_must_run(self):
        no_choices = PREDICT.replace('    choices: ["333\\n3.5", "333.3\\n3.5", "333\\n3"]\n', "")
        self.assertEqual(self.errors(no_choices), [])
        crashing = no_choices.replace("print(7 / 2)", "print(7 / 0)")
        self.assertTrue(any("ZeroDivisionError" in e for e in self.errors(crashing)))
        broken = no_choices.replace("print(7 / 2)", "print(7 /")
        self.assertTrue(any("not valid Python" in e for e in self.errors(broken)))

    def test_predict_required_fields(self):
        errors = self.errors(PREDICT.replace('    explain: "// rounds down."\n', ""))
        self.assertTrue(any("'explain' is missing" in e for e in errors))

    # ---- break_it ----

    def test_break_it_example_input_must_really_break_the_spec(self):
        errors = self.errors(BREAK_IT.replace('example_input: "1000, 3"', 'example_input: "1200, 3"'))
        self.assertTrue(any("example_input" in e and "must break" in e for e in errors), errors)

    def test_break_it_normal_input_must_meet_the_spec(self):
        errors = self.errors(BREAK_IT.replace('normal_input: "900, 3"', 'normal_input: "901, 3"'))
        self.assertTrue(any("normal_input" in e and "meet the spec" in e for e in errors), errors)

    def test_break_it_crash_counts(self):
        crash = BREAK_IT.replace('example_input: "1000, 3"', 'example_input: "1000, 0"')
        self.assertTrue(any("got crashed" in e for e in self.errors(crash)))
        self.assertEqual(self.errors(crash.replace("    explain:", "    crash_counts: true\n    explain:")), [])
        bad_flag = BREAK_IT.replace("    explain:", "    crash_counts: maybe\n    explain:")
        self.assertTrue(any("crash_counts" in e for e in self.errors(bad_flag)))

    def test_break_it_call_and_fields(self):
        errors = self.errors(BREAK_IT.replace('call: "split_bill({input})"', 'call: "split_bill(1000, 3)"'))
        self.assertTrue(any("{input}" in e for e in errors), errors)
        errors = self.errors(BREAK_IT.replace('    spec: "Shares add up exactly; no two differ by more than 1."\n', ""))
        self.assertTrue(any("'spec' is missing" in e for e in errors))
        errors = self.errors(BREAK_IT.replace('check: "spec_ok({input}, result)"', 'check: "spec_ok({input}, result"'))
        self.assertTrue(any("check is not valid Python" in e for e in errors), errors)

    # ---- parsons ----

    def test_parsons_correct_order_must_pass(self):
        errors = self.errors(PARSONS.replace("== [1001, 1003]", "== [1001]"))
        self.assertTrue(any("correct order fails" in e for e in errors), errors)

    def test_parsons_distractor_must_fail(self):
        # Without the 45-minute order in the check, `>=` passes too: not a trap.
        errors = self.errors(PARSONS.replace("(1002, 45), ", ""))
        self.assertTrue(any("distractor 0" in e and "isn't a trap" in e for e in errors), errors)

    def test_parsons_shape(self):
        errors = self.errors(PARSONS.replace("        replaces: 3\n", "        replaces: 9\n"))
        self.assertTrue(any("'replaces'" in e for e in errors), errors)
        errors = self.errors(PARSONS.replace('line: "        if minutes >= 45:"', 'line: "    late = []"'))
        self.assertTrue(any("must be different" in e for e in errors), errors)
        no_distractors = PARSONS.split("    distractors:")[0] + "    distractors: []\n    check: 'assert True'\n"
        self.assertTrue(any("'distractors'" in e for e in self.errors(no_distractors)))
        short = textwrap.dedent("""\
            parsons:
              - goal: "g"
                lines: ["x = 1"]
                distractors: [{line: "x = 2", replaces: 0, explain: "e"}]
                check: "assert x == 1"
            """)
        self.assertTrue(any("at least 3 lines" in e for e in self.errors(short)))

    def test_parsons_expected_output(self):
        text = textwrap.dedent("""\
            parsons:
              - goal: "Print 1 to 3."
                lines: ["for i in range(1, 4):", "    print(i)", "print('done')"]
                distractors: [{line: "for i in range(3):", replaces: 0, explain: "range(3) starts at 0."}]
                check: ""
                expected_output: "1\\n2\\n3\\ndone"
            """)
        self.assertEqual(self.errors(text), [])  # expected_output alone is enough
        self.assertTrue(any("isn't a trap" in e for e in self.errors(text.replace("1\\n2\\n3\\ndone", "0\\n1\\n2\\ndone").replace(
            '"for i in range(1, 4):"', '"for i in range(0, 3):"'))))
        no_check = text.replace('    check: ""\n', "").replace('    expected_output: "1\\n2\\n3\\ndone"\n', "")
        self.assertTrue(any("needs a 'check'" in e for e in self.errors(no_check)))


class ByteWhyTests(unittest.TestCase):
    SUGGESTION = """\
suggestion:
  file: app/calc.py
  find: "    return x + 2"
  replace: "    return x * 2"
  correct: true
  says: "Doubling is times two."
  explain: "x * 2 doubles x."
"""

    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def errors(self, why):
        t = make_ticket(self.root, f"t{len(list(self.root.iterdir())) + 1:02d}")
        write(t / "byte.yaml", self.SUGGESTION + why)
        return vc.check_ticket_meta(t)

    def test_valid_why(self):
        self.assertEqual(self.errors('  why:\n    choices: ["a", "b", "c"]\n    answer: 2\n'), [])
        self.assertEqual(self.errors(""), [])  # optional

    def test_why_needs_three_distinct_choices_and_a_valid_answer(self):
        self.assertTrue(any("exactly 3" in e for e in self.errors('  why:\n    choices: ["a", "b"]\n    answer: 0\n')))
        self.assertTrue(any("all be different" in e for e in self.errors('  why:\n    choices: ["a", "a", "c"]\n    answer: 0\n')))
        self.assertTrue(any("out of range" in e for e in self.errors('  why:\n    choices: ["a", "b", "c"]\n    answer: 3\n')))
        self.assertTrue(any("whole number" in e for e in self.errors('  why:\n    choices: ["a", "b", "c"]\n    answer: true\n')))
        self.assertTrue(any("unknown field" in e for e in self.errors('  why:\n    choices: ["a", "b", "c"]\n    answer: 0\n    hint: x\n')))
        self.assertTrue(any("must be a mapping" in e for e in self.errors('  why: "because"\n')))


if __name__ == "__main__":
    unittest.main()
