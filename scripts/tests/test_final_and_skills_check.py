"""Tests for the off-chain / final season flags and the skills check in
scripts/validate_content.py.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import copy
import shutil
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import validate_content as vc  # noqa: E402
from test_runner_and_validator import make_ticket, write  # noqa: E402

REAL_SKILLS_CHECK = REPO_ROOT / "content" / "assessment" / "skills-check.yaml"


def season_yaml(sid, tickets, extra=""):
    return f"id: {sid}\ntitle: T\nintro: I\n{extra}tickets: [{', '.join(tickets)}]\n"


def ticket_yaml(tid):
    return textwrap.dedent(f"""\
        id: {tid}
        title: "Test ticket"
        type: bug
        level: intern
        track: foundations
        concepts: [numbers]
        new_concept: numbers
        estimated_minutes: 10
        tests_visible: true
        files_editable: [app/calc.py]
    """)


class SeasonChainTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.seasons = self.tmp / "seasons"

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def season(self, folder, sid, n, extra="", **ticket_kwargs):
        names = [f"t{i:02d}" for i in range(1, n + 1)]
        write(self.seasons / folder / "season.yaml", season_yaml(sid, names, extra))
        for name in names:
            t = make_ticket(self.seasons / folder / "tickets", name, yaml_text=ticket_yaml(f"{sid}-{name}"), **ticket_kwargs)
            if "final: true" in extra:
                (t / "hints.md").unlink()  # exam tickets have no hints
        return self.seasons / folder

    def test_off_chain_season_skips_the_evolution_check(self):
        # Every ticket uses the same starter/solution, so solution(N) != starter(N+1) would be
        # flagged on-chain (the solution differs from the next starter). Off-chain it's fine.
        self.season("s01-a", "s01", 1)
        self.season("s99-final", "s99", 2, extra="chain: false\nfinal: true\n")
        report = vc.validate_content(self.tmp)
        self.assertEqual(report["s99-final/t01"], [])
        self.assertEqual(report["s99-final/t02"], [])

    def test_on_chain_season_still_checks_evolution(self):
        self.season("s01-a", "s01", 2)
        report = vc.validate_content(self.tmp)
        self.assertTrue(any("differs" in e for e in report["s01-a/t02"]), report["s01-a/t02"])

    def test_on_chain_season_continues_from_the_last_on_chain_season(self):
        # s02 (off-chain side quest) sits between s01 and s03; s03 continues from s01.
        s1 = self.season("s01-a", "s01", 1)
        s2 = self.season("s02-side", "s02", 1, extra="chain: false\n")
        s3 = self.season("s03-c", "s03", 1)
        # The side quest leaves an extra file behind; s03 must NOT be compared with it.
        write(s2 / "tickets" / "t01" / "solution" / "app" / "side.py", "X = 1\n")
        # s03's starter continues from s01's solution, except calc.py (its bug).
        write(s3 / "tickets" / "t01" / "starter" / "app" / "calc.py", BUGGY_CHANGED)
        write(s1 / "tickets" / "t01" / "solution" / "app" / "calc.py", BUGGY_CHANGED.replace("x + 2", "x * 2"))
        report = vc.validate_content(self.tmp)
        self.assertEqual(report["s02-side/t01"], [])
        self.assertEqual(report["s03-c/t01"], ["app/calc.py differs from t01/solution"])

    def test_final_ticket_must_not_have_hints_or_lessons(self):
        self.season("s99-final", "s99", 1, extra="chain: false\nfinal: true\n")
        t = self.seasons / "s99-final" / "tickets" / "t01"
        write(t / "hints.md", "a hint\n")
        write(t / "concept.md", "**Lesson**\n\nText.\n")
        report = vc.validate_content(self.tmp)
        errors = report["s99-final/t01"]
        self.assertTrue(any("hints.md is not allowed" in e for e in errors), errors)
        self.assertTrue(any("concept.md is not allowed" in e for e in errors), errors)

    def test_final_ticket_needs_no_hints_file(self):
        self.season("s99-final", "s99", 1, extra="chain: false\nfinal: true\n")
        self.assertEqual(vc.validate_content(self.tmp)["s99-final/t01"], [])

    def test_normal_ticket_still_needs_hints(self):
        self.season("s01-a", "s01", 1)
        (self.seasons / "s01-a" / "tickets" / "t01" / "hints.md").unlink()
        self.assertIn("missing hints.md", vc.validate_content(self.tmp)["s01-a/t01"])

    def test_final_season_must_be_off_chain(self):
        self.season("s99-final", "s99", 1, extra="final: true\n")
        report = vc.validate_content(self.tmp)
        self.assertTrue(any("must be off-chain" in e for e in report["s99-final"]), report["s99-final"])

    def test_flags_must_be_booleans(self):
        self.season("s01-a", "s01", 1, extra="chain: nope\n")
        report = vc.validate_content(self.tmp)
        self.assertIn("season.yaml: 'chain' must be true or false", report["s01-a"])

    def test_final_season_must_come_last(self):
        self.season("s05-final", "s05", 1, extra="chain: false\nfinal: true\n")
        self.season("s06-more", "s06", 1)
        report = vc.validate_content(self.tmp)
        self.assertTrue(any("after the final season" in e for e in report["s06-more"]), report["s06-more"])

    def test_season_flags_defaults(self):
        s = self.season("s01-a", "s01", 1)
        self.assertEqual(vc.season_flags(s), (True, False))


BUGGY_CHANGED = "def double(x):\n    return x + 2  # changed\n"


class SkillsCheckTests(unittest.TestCase):
    """Every item kind is verified by running it; ids, counts and balance are checked."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.data = yaml.safe_load(REAL_SKILLS_CHECK.read_text(encoding="utf-8"))

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def check(self, data):
        path = self.tmp / "skills-check.yaml"
        path.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")
        return vc.check_skills_check(path)

    def item(self, kind):
        return next(i for i in self.data["items"] if i["kind"] == kind)

    def test_real_skills_check_is_valid(self):
        self.assertEqual(vc.check_skills_check(REAL_SKILLS_CHECK), [])

    def test_real_skills_check_has_twelve_items_of_every_kind(self):
        kinds = [i["kind"] for i in self.data["items"]]
        self.assertEqual(len(kinds), 12)
        self.assertEqual(set(kinds), set(vc.SKILLS_KINDS))

    def test_wrong_predict_answer_is_flagged(self):
        item = self.item("predict")
        item["answer"] = (item["answer"] + 1) % len(item["choices"])
        errors = self.check(self.data)
        self.assertTrue(any(item["id"] in e and "prints" in e for e in errors), errors)

    def test_catch_input_answer_must_be_the_only_catching_input(self):
        item = self.item("catch_input")
        item["answer"] = (item["answer"] + 1) % len(item["choices"])
        errors = self.check(self.data)
        self.assertTrue(any(item["id"] in e and "may catch the bug" in e for e in errors), errors)

    def test_catch_input_where_two_inputs_catch_it_is_flagged(self):
        item = next(i for i in self.data["items"] if i["id"] == "catch-free-delivery")
        item["choices"][0] = "2500.0"  # catches the same > vs >= bug as "2500"
        errors = self.check(self.data)
        self.assertTrue(any(item["id"] in e and "disagree: [0, 1]" in e for e in errors), errors)

    def test_spot_line_wrong_answer_is_flagged(self):
        item = self.item("spot_line")
        item["answer"] = (item["answer"] + 1) % len(item["choices"])
        errors = self.check(self.data)
        self.assertTrue(any(item["id"] in e and "still fails" in e for e in errors), errors)

    def test_spot_line_choice_must_be_a_line_of_the_code(self):
        item = self.item("spot_line")
        item["choices"][0] = "print('not in the code')"
        errors = self.check(self.data)
        self.assertTrue(any("must be exactly one line of the code" in e for e in errors), errors)

    def test_spot_line_code_that_already_passes_is_flagged(self):
        item = next(i for i in self.data["items"] if i["id"] == "spot-count-late")
        item["code"] = item["code"].replace("late = 1", "late += 1")
        item["choices"][3] = "late += 1"
        errors = self.check(self.data)
        self.assertTrue(any("already passes the check" in e for e in errors), errors)

    def test_pick_answer_wrong_answer_is_flagged(self):
        item = self.item("pick_answer")
        item["answer"] = (item["answer"] + 1) % 3
        errors = self.check(self.data)
        self.assertTrue(any(item["id"] in e and "may pass the check" in e for e in errors), errors)

    def test_pick_answer_needs_three_answers(self):
        item = self.item("pick_answer")
        item["choices"] = item["choices"][:2]
        item["answer"] = min(item["answer"], 1)
        errors = self.check(self.data)
        self.assertTrue(any("exactly 3 answers" in e for e in errors), errors)

    def test_duplicate_ids_are_flagged(self):
        self.data["items"][1]["id"] = self.data["items"][0]["id"]
        errors = self.check(self.data)
        self.assertTrue(any("id is also used by item 0" in e for e in errors), errors)

    def test_item_count_is_checked(self):
        self.data["items"] = self.data["items"][:11]
        errors = self.check(self.data)
        self.assertTrue(any("exactly 12 items" in e for e in errors), errors)

    def test_unknown_kind_is_flagged(self):
        self.data["items"][0]["kind"] = "essay"
        errors = self.check(self.data)
        self.assertTrue(any("kind 'essay'" in e for e in errors), errors)

    def test_right_answer_always_longest_is_flagged(self):
        # Same meaning, longer text: wrap catch_input literals in brackets and
        # add a comment to the right pick_answer, so the right one is the longest in 6 items.
        data = copy.deepcopy(self.data)
        for item in data["items"]:
            right = item["choices"][item["answer"]]
            if item["kind"] == "catch_input":
                item["choices"][item["answer"]] = "((((((" + right + "))))))"
            elif item["kind"] == "pick_answer":
                item["choices"][item["answer"]] = right + "\n# " + "x" * 200
        errors = self.check(data)
        self.assertTrue(any("is the longest choice in" in e for e in errors), errors)

    def test_right_is_longest_helper(self):
        self.assertTrue(vc.right_is_longest(["a", "bbb", "cc"], 1))
        self.assertFalse(vc.right_is_longest(["aaa", "bbb"], 1))  # a tie isn't "longest"
        self.assertFalse(vc.right_is_longest(["a", "b", "cc"], 0))


if __name__ == "__main__":
    unittest.main()
