"""Tests for trace tables (formats.yaml `trace`, lib/runner/formats.py + tracer.py) and
side-quest seasons (the Bug Bounty board: `chain: false` without `final`, ticket
`requires` and `bug_kind`) in scripts/validate_content.py.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import json
import shutil
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(REPO_ROOT / "lib" / "runner"))

import formats  # noqa: E402  (the code the browser runs too)
import tracer  # noqa: E402
import validate_content as vc  # noqa: E402
from test_runner_and_validator import make_ticket, write  # noqa: E402

SUBTOTAL = textwrap.dedent("""\
    def cart_subtotal(prices):
        total = 0
        for price in prices:
            total = total + price
        return total

    subtotal = cart_subtotal([1250, 450, 299])
""")

# What Python really does, step by step: (line just run, price, total).
SUBTOTAL_ROWS = [
    (2, None, "0"),
    (3, "1250", "0"),
    (4, "1250", "1250"),
    (3, "450", "1250"),
    (4, "450", "1700"),
    (3, "299", "1700"),
    (4, "299", "1999"),
]


def trace_yaml(code=SUBTOTAL, watch="[price, total]", rows=7):
    return "trace:\n  - code: |\n" + textwrap.indent(code, "      ") + f"    watch: {watch}\n    rows: {rows}\n    explain: \"Loops.\"\n"


class TraceSourceTests(unittest.TestCase):
    def test_records_module_and_function_steps(self):
        out = tracer.trace_source(SUBTOTAL)
        self.assertEqual(out["status"], "pass")
        funcs = {s["func"] for s in out["steps"]}
        self.assertEqual(funcs, {"<module>", "cart_subtotal"})
        self.assertEqual(out["steps"][-1]["locals"], [["subtotal", "1999"]])

    def test_errors_and_endless_loops_are_reported(self):
        self.assertEqual(tracer.trace_source("x = 1 / 0\n")["status"], "error")
        self.assertIn("ZeroDivisionError", tracer.trace_source("x = 1 / 0\n")["message"])
        stopped = tracer.trace_source("n = 0\nwhile True:\n    n = n + 1\n", max_steps=50)
        self.assertEqual(stopped["status"], "stopped")
        self.assertTrue(stopped["truncated"])

    def test_learner_except_cannot_swallow_the_step_limit(self):
        code = "def f():\n    while True:\n        try:\n            pass\n        except Exception:\n            pass\n\nf()\n"
        self.assertEqual(tracer.trace_source(code, max_steps=40)["status"], "stopped")

    def test_trace_test_is_unchanged(self):
        # The debugger's tracer still traces one check of a ticket.
        root = Path(tempfile.mkdtemp())
        try:
            write(root / "code" / "calc.py", "def double(x):\n    y = x * 2\n    return y\n")
            write(root / "tests" / "test_calc.py", "from calc import double\n\ndef test_it():\n    assert double(2) == 4\n")
            out = tracer.trace_test(str(root / "code"), str(root / "tests"), "test_calc.py", "test_it")
            self.assertEqual(out["status"], "pass")
            self.assertEqual(out["steps"][0]["event"], "call")
            self.assertEqual(out["steps"][0]["file"], "calc.py")
        finally:
            shutil.rmtree(root)


class TraceTableTests(unittest.TestCase):
    def test_rows_are_the_steps_where_a_watched_variable_changes(self):
        out = formats.trace_table(SUBTOTAL, ["price", "total"])
        self.assertIsNone(out["error"])
        self.assertEqual([(r["line"], *r["values"]) for r in out["rows"]], SUBTOTAL_ROWS)
        self.assertNotIn("cells", out)

    def test_parameters_count_from_the_call_and_mutation_counts_as_a_change(self):
        code = "def add(items, x):\n    items.append(x)\n    return items\n\nbag = []\nadd(bag, 1)\n"
        rows = formats.trace_table(code, ["items"])["rows"]
        self.assertEqual([r["values"] for r in rows], [["[]"], ["[1]"]])
        self.assertEqual(rows[0]["line"], 1)  # the call binds the parameter on the def line

    def test_all_right_with_empty_cells_meaning_same_as_above(self):
        answers = [["", "0"], ["1250", ""], ["", "1250"], ["450", ""], ["", "1700"], ["299", ""], ["", "1999"]]
        out = formats.trace_table(SUBTOTAL, ["price", "total"], answers)
        self.assertTrue(out["all_right"])
        self.assertIsNone(out["first_wrong"])

    def test_first_wrong_row_is_reported(self):
        answers = [[v or "" for v in row[1:]] for row in SUBTOTAL_ROWS]
        answers[2][1] = "1700"  # added the wrong price
        answers[4][1] = "1999"
        out = formats.trace_table(SUBTOTAL, ["price", "total"], answers)
        self.assertFalse(out["all_right"])
        self.assertEqual(out["first_wrong"], 2)
        self.assertEqual(out["cells"][2], [True, False])
        self.assertEqual(out["cells"][0], [True, True])

    def test_missing_and_extra_rows_are_wrong(self):
        short = [[v or "" for v in row[1:]] for row in SUBTOTAL_ROWS[:5]]
        out = formats.trace_table(SUBTOTAL, ["price", "total"], short)
        self.assertEqual(out["first_wrong"], 5)
        extra = [[v or "" for v in row[1:]] for row in SUBTOTAL_ROWS] + [["1", "1"]]
        self.assertFalse(formats.trace_table(SUBTOTAL, ["price", "total"], extra)["all_right"])

    def test_cell_matching_is_normalised(self):
        m = formats.cell_matches
        self.assertTrue(m('"ab"', "'ab'"))
        self.assertTrue(m("ab", "'ab'"))  # quotes optional for text
        self.assertTrue(m("[1,2]", "[1, 2]"))
        self.assertTrue(m(" 7 ", "7"))
        self.assertTrue(m("('a',1)", "('a', 1)"))
        self.assertTrue(m("", None))
        self.assertFalse(m("1.0", "1"))  # types matter
        self.assertFalse(m("True", "1"))
        self.assertFalse(m("None", "'None'"))
        self.assertFalse(m("'7'", "7"))
        self.assertFalse(m("", "0"))
        self.assertFalse(m("0", None))

    def test_handle_json(self):
        out = json.loads(formats.handle_json(json.dumps({"kind": "trace", "code": SUBTOTAL, "watch": ["total"], "answers": [["0"]]})))
        self.assertEqual(len(out["rows"]), 4)
        self.assertEqual(out["first_wrong"], 1)


class TraceYamlTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def errors(self, text):
        t = make_ticket(self.root, f"t{len(list(self.root.iterdir())) + 1:02d}")
        write(t / "formats.yaml", text)
        return vc.check_ticket_meta(t)

    def test_valid_trace(self):
        self.assertEqual(self.errors(trace_yaml()), [])

    def test_rows_must_match_the_real_trace(self):
        errors = self.errors(trace_yaml(rows=6))
        self.assertTrue(any("rows is 6, but tracing the code gives 7" in e for e in errors), errors)

    def test_watch_must_name_real_variables(self):
        errors = self.errors(trace_yaml(watch="[price, totl]", rows=7))
        self.assertTrue(any("'totl' never gets a value" in e for e in errors), errors)
        self.assertTrue(any("variable names" in e for e in self.errors(trace_yaml(watch="[1x]"))))
        self.assertTrue(any("1-4 different" in e for e in self.errors(trace_yaml(watch="[a, b, c, d, e]"))))
        self.assertTrue(any("1-4 different" in e for e in self.errors(trace_yaml(watch="[a, a]"))))

    def test_code_must_run_cleanly_and_shape(self):
        self.assertTrue(any("raised ZeroDivisionError" in e for e in self.errors(trace_yaml("x = 1\ny = x / 0\n", "[x]", 1))))
        self.assertTrue(any("not valid Python" in e for e in self.errors(trace_yaml("x = (\ny = 2\n", "[x]", 1))))
        self.assertTrue(any("whole number" in e for e in self.errors(trace_yaml(rows=0))))
        self.assertTrue(any("too many steps" in e for e in self.errors(trace_yaml("n = 0\nwhile True:\n    n = n + 1\n", "[n]", 3))))

    def test_long_values_are_flagged(self):
        code = "names = []\nfor n in ['margherita', 'quattro formaggi', 'calzone']:\n    names.append(n)\n"
        errors = self.errors(trace_yaml(code, "[names]", 4))
        self.assertTrue(any("too long" in e for e in errors), errors)


SIDE_TICKET = textwrap.dedent("""\
    id: {tid}
    title: "{title}"
    type: bug
    level: intern
    track: debugging
    concepts: [numbers]
    new_concept: {concept}
    estimated_minutes: 5
    tests_visible: true
    files_editable: [app/calc.py]
    {extra}
""")


class SideQuestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.seasons = self.tmp / "seasons"
        # The main story: one on-chain season whose ticket teaches `numbers` with a lesson.
        write(self.seasons / "s01-a" / "season.yaml", "id: s01\ntitle: T\nintro: I\ntickets: [t01]\n")
        main = make_ticket(self.seasons / "s01-a" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s01-t01", title="Main", concept="numbers", extra=""))
        write(main / "concept.md", "**Numbers**\n\nText.\n")
        # The final exam comes last.
        write(self.seasons / "s99-final" / "season.yaml", "id: s99\ntitle: F\nintro: I\nchain: false\nfinal: true\ntickets: [t01]\n")
        exam = make_ticket(self.seasons / "s99-final" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s99-t01", title="Exam", concept="final-exam", extra=""))
        (exam / "hints.md").unlink()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def bounty(self, extra='requires: s01-t01\nbug_kind: "off-by-one"', title="Mystery", concept="numbers", story=None):
        write(self.seasons / "s50-bounty" / "season.yaml", "id: s50\ntitle: B\nintro: I\nchain: false\ntickets: [t01]\n")
        t = make_ticket(self.seasons / "s50-bounty" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s50-t01", title=title, concept=concept, extra=extra))
        if story is not None:
            write(t / "story.md", story)
        return t

    def report(self):
        return vc.validate_content(self.tmp)

    def test_valid_side_quest(self):
        self.bounty()
        report = self.report()
        self.assertEqual(report["s50-bounty"], [])
        self.assertEqual(report["s50-bounty/t01"], [])
        self.assertEqual(report["s99-final/t01"], [])

    def test_side_quest_may_come_before_the_final(self):
        # An off-chain side quest is not "on-chain after the final", and the final stays valid.
        self.bounty()
        self.assertFalse(any("final" in e for e in self.report()["s50-bounty"]))

    def test_bug_kind_is_optional_but_not_empty(self):
        self.bounty(extra="requires: s01-t01")
        self.assertEqual(self.report()["s50-bounty/t01"], [])
        shutil.rmtree(self.seasons / "s50-bounty")
        self.bounty(extra='requires: s01-t01\nbug_kind: ""')
        self.assertTrue(any("'bug_kind' must be" in e for e in self.report()["s50-bounty/t01"]))

    def test_requires_is_optional(self):
        self.bounty(extra='bug_kind: "off-by-one"')
        self.assertEqual(self.report()["s50-bounty/t01"], [])

    def test_requires_must_be_a_real_on_chain_ticket_with_the_same_concept(self):
        self.bounty(extra='requires: s01-t09\nbug_kind: "off-by-one"')
        self.assertTrue(any("not a ticket id" in e for e in self.report()["s50-bounty/t01"]))
        shutil.rmtree(self.seasons / "s50-bounty")
        self.bounty(extra='requires: s99-t01\nbug_kind: "off-by-one"', concept="final-exam")
        errors = self.report()["s50-bounty/t01"]
        self.assertTrue(any("is not on the main story" in e and "no lesson" in e for e in errors), errors)
        shutil.rmtree(self.seasons / "s50-bounty")
        self.bounty(concept="loops")
        errors = self.report()["s50-bounty/t01"]
        self.assertTrue(any("teaches 'numbers'" in e for e in errors), errors)

    def test_requires_must_be_a_string(self):
        self.bounty(extra='requires: [s01-t01]\nbug_kind: "off-by-one"')
        self.assertTrue(any("'requires' must be a ticket id" in e for e in self.report()["s50-bounty/t01"]))

    def test_no_lesson_and_no_giveaway(self):
        t = self.bounty(title="An off-by-one in the cart", story="The OFF-BY-ONE strikes again.\n")
        write(t / "concept.md", "**Numbers**\n\nText.\n")
        errors = self.report()["s50-bounty/t01"]
        self.assertTrue(any("concept.md is not allowed in a side-quest" in e for e in errors), errors)
        self.assertTrue(any(e.startswith("title names the bug") for e in errors), errors)
        self.assertTrue(any(e.startswith("story.md names the bug") for e in errors), errors)

    def test_side_quests_are_short(self):
        self.bounty(extra='bug_kind: "off-by-one"').joinpath("ticket.yaml").write_text(
            SIDE_TICKET.format(tid="s50-t01", title="M", concept="numbers", extra='bug_kind: "off-by-one"').replace(
                "estimated_minutes: 5", "estimated_minutes: 20"))
        self.assertTrue(any("at most 10" in e for e in self.report()["s50-bounty/t01"]))

    def test_side_quest_fields_only_on_side_quests(self):
        main = self.seasons / "s01-a" / "tickets" / "t01" / "ticket.yaml"
        main.write_text(main.read_text() + "requires: s01-t01\n")
        errors = self.report()["s01-a/t01"]
        self.assertTrue(any("'requires' is only for side-quest tickets" in e for e in errors), errors)


class RealBountyContentTests(unittest.TestCase):
    """The real Bug Bounty board: 8 mystery bugs, each gated on the ticket that taught it."""

    def test_bounty_board(self):
        import yaml

        season_dir = REPO_ROOT / "content" / "seasons" / "s50-bug-bounty"
        season = yaml.safe_load((season_dir / "season.yaml").read_text())
        self.assertIs(season["chain"], False)
        self.assertNotIn("final", season)
        self.assertEqual(len(season["tickets"]), 8)
        kinds = set()
        for name in season["tickets"]:
            meta = yaml.safe_load((season_dir / "tickets" / name / "ticket.yaml").read_text())
            self.assertTrue(meta["requires"].startswith(("s01", "s02", "s03", "s04", "s05")), meta["requires"])
            self.assertLessEqual(meta["estimated_minutes"], 10)
            kinds.add(meta["bug_kind"])
        self.assertEqual(len(kinds), 8)
        report = vc.validate_content(REPO_ROOT / "content")
        bounty = {k: v for k, v in report.items() if k.startswith("s50-bug-bounty")}
        self.assertEqual(len(bounty), 9)
        self.assertTrue(all(v == [] for v in bounty.values()), bounty)


if __name__ == "__main__":
    unittest.main()
