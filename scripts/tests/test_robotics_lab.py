"""Tests for side floors (season.yaml `chain: false` + `requires`, e.g. the Robotics Lab)
in scripts/validate_content.py, and for the Lab viewer's helper, lib/runner/lab.py
(`from lab import viz`), including how test_runner returns what it drew.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import json
import math
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

import lab  # noqa: E402
import test_runner  # noqa: E402
import validate_content as vc  # noqa: E402
from test_runner_and_validator import FIXED, make_ticket, write  # noqa: E402
from test_trace_and_bounty import SIDE_TICKET  # noqa: E402

FLOOR = "id: s40\ntitle: Lab\nicon: \"🤖\"\nintro: I\nchain: false\nrequires: {requires}\ntickets: [t01, t02]\n"


class SideFloorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.seasons = self.tmp / "seasons"
        write(self.seasons / "s01-a" / "season.yaml", "id: s01\ntitle: T\nintro: I\ntickets: [t01]\n")
        make_ticket(self.seasons / "s01-a" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s01-t01", title="Main", concept="numbers", extra=""))
        write(self.seasons / "s99-final" / "season.yaml", "id: s99\ntitle: F\nintro: I\nchain: false\nfinal: true\ntickets: [t01]\n")
        exam = make_ticket(self.seasons / "s99-final" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s99-t01", title="Exam", concept="final-exam", extra=""))
        (exam / "hints.md").unlink()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def floor(self, requires="s01-t01", season_text=None, extra=""):
        """A two-ticket side floor: ticket 2 keeps ticket 1's solved calc.py and adds triple.py."""
        write(self.seasons / "s40-lab" / "season.yaml", season_text or FLOOR.format(requires=requires))
        root = self.seasons / "s40-lab" / "tickets"
        tickets = []
        for i in (1, 2):
            t = make_ticket(root, f"t0{i}", yaml_text=SIDE_TICKET.format(
                tid=f"s40-t0{i}", title=f"Lab {i}", concept="numbers", extra=extra).replace("debugging", "robotics"))
            write(t / "concept.md", "**Numbers**\n\nText.\n")
            tickets.append(t)
        second = tickets[1]
        for folder in ("starter", "solution"):
            write(second / folder / "app" / "calc.py", FIXED)
        write(second / "starter" / "app" / "triple.py", "def triple(x):\n    return x + 3\n")
        write(second / "solution" / "app" / "triple.py", "def triple(x):\n    return x * 3\n")
        write(second / "tests" / "test_calc.py", "from app.triple import triple\n\ndef test_triple():\n    assert triple(2) == 6\n")
        return tickets

    def report(self):
        return vc.validate_content(self.tmp)

    def test_valid_side_floor(self):
        self.floor()
        report = self.report()
        self.assertEqual(report["s40-lab"], [])
        self.assertEqual(report["s40-lab/t01"], [])
        self.assertEqual(report["s99-final/t01"], [])

    def test_requires_must_be_an_on_chain_ticket(self):
        self.floor(requires="s01-t09")
        self.assertTrue(any("not a ticket of an on-chain season" in e for e in self.report()["s40-lab"]))
        shutil.rmtree(self.seasons / "s40-lab")
        self.floor(requires="s99-t01")
        self.assertTrue(any("not a ticket of an on-chain season" in e for e in self.report()["s40-lab"]))

    def test_requires_only_on_off_chain_non_final_seasons(self):
        season = self.seasons / "s01-a" / "season.yaml"
        season.write_text(season.read_text() + "requires: s01-t01\n")
        self.assertTrue(any("only for side floors" in e for e in self.report()["s01-a"]))

    def test_icon_is_short(self):
        self.floor(season_text=FLOOR.format(requires="s01-t01").replace('icon: "🤖"', 'icon: "a very long icon text"'))
        self.assertTrue(any("'icon' must be a short text" in e for e in self.report()["s40-lab"]))

    def test_every_ticket_needs_a_lesson(self):
        tickets = self.floor()
        (tickets[1] / "concept.md").unlink()
        self.assertTrue(any("missing concept.md" in e for e in self.report()["s40-lab/t02"]))

    def test_no_bounty_fields_or_tutorial(self):
        self.floor(extra='bug_kind: "off-by-one"')
        errors = self.report()["s40-lab/t01"]
        self.assertTrue(any("'bug_kind' is only for side-quest tickets" in e for e in errors), errors)

    def test_codebase_evolves_inside_the_floor_only(self):
        tickets = self.floor()
        self.assertEqual(self.report()["s40-lab/t02"], [])
        # Ticket 2's starter drifts from ticket 1's solution: caught inside the floor.
        write(tickets[1] / "starter" / "app" / "calc.py", FIXED + "# changed\n")
        self.assertTrue(any("differs from t01/solution" in e for e in self.report()["s40-lab/t02"]))
        # ...but the floor's first ticket never has to continue from the story.
        self.assertFalse(any("differs" in e or "missing" in e for e in self.report()["s40-lab/t01"]))

    def test_side_floor_never_blocks_the_final(self):
        self.floor()
        self.assertFalse(any("final" in e for e in self.report()["s40-lab"]))

    # ---------- sequential side floors: a floor that opens after another floor ----------

    def next_floor(self, requires="s40-t02"):
        """A second one-ticket side floor (s41) that opens after a ticket of the first (s40)."""
        write(self.seasons / "s41-next" / "season.yaml",
              f"id: s41\ntitle: Next\nintro: I\nchain: false\nrequires: {requires}\ntickets: [t01]\n")
        t = make_ticket(self.seasons / "s41-next" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s41-t01", title="Next 1", concept="numbers", extra="").replace("debugging", "robotics"))
        write(t / "concept.md", "**Numbers**\n\nText.\n")

    def test_a_side_floor_may_require_another_side_floors_ticket(self):
        self.floor()
        self.next_floor("s40-t02")
        report = self.report()
        self.assertEqual(report["s41-next"], [])
        self.assertEqual(report["s41-next/t01"], [])
        self.assertEqual(report["s40-lab"], [])
        # Not the last ticket is fine too ("opens after ticket #1 of ...").
        shutil.rmtree(self.seasons / "s41-next")
        self.next_floor("s40-t01")
        self.assertEqual(self.report()["s41-next"], [])

    def test_sequential_requires_must_exist(self):
        self.floor()
        self.next_floor("s40-t07")
        errors = self.report()["s41-next"]
        self.assertTrue(any("not a ticket of an on-chain season or of another side floor" in e for e in errors), errors)

    def test_sequential_requires_never_names_the_final_or_a_bounty_ticket(self):
        self.floor()
        self.next_floor("s99-t01")
        self.assertTrue(any("not a ticket of an on-chain season or of another side floor" in e for e in self.report()["s41-next"]))
        shutil.rmtree(self.seasons / "s41-next")
        write(self.seasons / "s50-bounty" / "season.yaml", "id: s50\ntitle: B\nintro: I\nchain: false\ntickets: [t01]\n")
        make_ticket(self.seasons / "s50-bounty" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s50-t01", title="Bug", concept="numbers", extra=""))
        self.next_floor("s50-t01")
        self.assertTrue(any("not a ticket of an on-chain season or of another side floor" in e for e in self.report()["s41-next"]))

    def test_a_floor_cannot_require_its_own_ticket(self):
        self.floor(requires="s40-t02")
        errors = self.report()["s40-lab"]
        self.assertTrue(any("one of this floor's own tickets" in e for e in errors), errors)

    def test_side_floors_requires_must_not_loop(self):
        self.floor(requires="s41-t01")  # s40 needs s41 ...
        self.next_floor("s40-t02")  # ... and s41 needs s40: neither could ever open
        report = self.report()
        for name in ("s40-lab", "s41-next"):
            self.assertTrue(any("go round in a circle" in e for e in report[name]), report[name])
        self.assertTrue(any("s40-lab → s41-next → s40-lab" in e for e in report["s40-lab"]), report["s40-lab"])

    def test_sequential_floors_never_block_the_story_or_the_final(self):
        self.floor()
        self.next_floor("s40-t02")
        report = self.report()
        self.assertEqual(report["s01-a"], [])
        self.assertEqual(report["s99-final"], [])
        self.assertEqual(report["s99-final/t01"], [])
        # A story season can't require anything at all (so never a side floor's ticket).
        season = self.seasons / "s01-a" / "season.yaml"
        season.write_text(season.read_text() + "requires: s41-t01\n")
        self.assertTrue(any("only for side floors" in e for e in self.report()["s01-a"]))


class RealRoboticsLabTests(unittest.TestCase):
    """The real Robotics Lab floor: 8 lesson tickets, opened by the end of Season 1."""

    def test_robotics_lab(self):
        import yaml

        season_dir = REPO_ROOT / "content" / "seasons" / "s40-robotics-lab"
        season = yaml.safe_load((season_dir / "season.yaml").read_text())
        self.assertIs(season["chain"], False)
        self.assertNotIn("final", season)
        self.assertEqual(season["requires"], "s01-t10")
        self.assertEqual(len(season["tickets"]), 8)
        concepts, byte_right, byte_total, formats = set(), 0, 0, 0
        for name in season["tickets"]:
            t = season_dir / "tickets" / name
            meta = yaml.safe_load((t / "ticket.yaml").read_text())
            concepts.add(meta["new_concept"])
            words = len((t / "concept.md").read_text().split())
            self.assertLessEqual(words, 230, f"{name}: concept.md has {words} words")
            byte = yaml.safe_load((t / "byte.yaml").read_text())
            if "suggestion" in byte:
                byte_total += 1
                byte_right += byte["suggestion"]["correct"]
            formats += (t / "formats.yaml").is_file()
        self.assertEqual(len(concepts), 8)
        self.assertGreaterEqual(byte_total, 5)
        self.assertTrue(0.55 <= byte_right / byte_total <= 0.65, (byte_right, byte_total))
        self.assertGreaterEqual(formats, 4)
        report = vc.validate_content(REPO_ROOT / "content")
        lab_report = {k: v for k, v in report.items() if k.startswith("s40-robotics-lab")}
        self.assertEqual(len(lab_report), 9)
        self.assertTrue(all(v == [] for v in lab_report.values()), lab_report)

    def test_every_ticket_draws_in_the_lab_viewer(self):
        season_dir = REPO_ROOT / "content" / "seasons" / "s40-robotics-lab" / "tickets"
        for t in sorted(season_dir.iterdir()):
            for folder in ("starter", "solution"):
                result = vc.run_ticket_tests(t / folder, t / "tests")
                self.assertTrue(result.get("viz"), f"{t.name}/{folder} drew nothing")
                self.assertLess(len(json.dumps(result["viz"])), lab.MAX_JSON)


class LabVizTests(unittest.TestCase):
    def setUp(self):
        lab.reset()

    def test_records_every_kind(self):
        lab.viz.arm([[0, 0], [math.pi / 2, 0]], (1.0, 0.8), target=(0, 1.8), ghost=[(1.8, 0), None])
        lab.viz.chart("Loss", [0, 1, 2], [1.0, 0.5, 0.25], label="train", hline=0.1, log=True)
        lab.viz.chart("Loss", [0, 1, 2], [1.2, 0.7, 0.4], label="test")
        lab.viz.grid("Q", [[0, 1], [None, 2]], path=[(0, 0), (1, 1)], start=(0, 0), goal=(1, 1), arrows=[["→", "↓"], ["", ""]])
        lab.viz.points("Grasps", [(1, 2), (3, 4)], labels=[0, 1], classes=("drop", "ok"))
        items = lab.collect()
        self.assertEqual([i["kind"] for i in items], ["arm", "chart", "grid", "points"])
        arm, chart = items[0], items[1]
        self.assertEqual(arm["frames"], [[0.0, 0.0], [1.5708, 0.0]])
        self.assertEqual(arm["ghost"], [[1.8, 0.0], None])
        self.assertEqual([s["label"] for s in chart["series"]], ["train", "test"])
        self.assertTrue(chart["log"])
        json.dumps(items)  # plain JSON

    def test_non_finite_numbers_become_null(self):
        lab.viz.chart("Loss", [0, 1, 2], [1.0, math.inf, math.nan])
        self.assertEqual(lab.collect()[0]["series"][0]["ys"], [1.0, None, None])

    def test_limits(self):
        frames = [[i / 1000, 0.0] for i in range(1000)]
        lab.viz.arm(frames)
        lab.viz.chart("Long", list(range(5000)), list(range(5000)))
        for i in range(lab.MAX_SERIES + 3):
            lab.viz.chart("Many", [0, 1], [i, i], label=str(i))
        for i in range(lab.MAX_ITEMS + 5):
            lab.viz.points(f"p{i}", [(0, 0)])
        items = lab.collect()
        self.assertEqual(len(items), lab.MAX_ITEMS)
        arm = items[0]
        self.assertEqual(len(arm["frames"]), lab.MAX_FRAMES)
        self.assertEqual(arm["frames"][-1], [0.999, 0.0])  # the last frame is always kept
        self.assertTrue(arm["truncated"])
        self.assertEqual(len(items[1]["series"][0]["xs"]), lab.MAX_POINTS)
        self.assertEqual(len(items[2]["series"]), lab.MAX_SERIES)

    def test_total_size_is_capped(self):
        for i in range(lab.MAX_ITEMS):
            lab.viz.arm([[j / 7, -j / 9, j / 11, j / 13, j / 17, j / 19] for j in range(lab.MAX_FRAMES)], [1] * 6, name=f"a{i}",
                        ghost=[(j / 3, j / 5) for j in range(lab.MAX_FRAMES)])
        items = lab.collect()
        self.assertLessEqual(len(json.dumps(items)), lab.MAX_JSON)
        self.assertTrue(all(i["truncated"] for i in items))

    def test_bad_input_raises_a_clear_error(self):
        with self.assertRaisesRegex(ValueError, "each frame needs 2 joint angles"):
            lab.viz.arm([[0.0]])
        with self.assertRaisesRegex(ValueError, "lengths must be positive"):
            lab.viz.arm([[0.0, 0.0]], (1.0, -1.0))
        with self.assertRaisesRegex(ValueError, "same length"):
            lab.viz.chart("x", [1, 2], [1])

    def test_same_name_replaces(self):
        lab.viz.points("p", [(0, 0)])
        lab.viz.points("p", [(1, 1), (2, 2)])
        items = lab.collect()
        self.assertEqual(len(items), 1)
        self.assertEqual(len(items[0]["points"]), 2)


class RunnerVizTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.tmp)
        # run_tests imports these into this process: don't let them shadow other tests' modules.
        for name in ["lab_fixture_arm", "lab_fixture_calc", "_ticket_tests_test_arm", "_ticket_tests_test_calc"]:
            sys.modules.pop(name, None)

    def test_run_tests_returns_what_the_tests_drew_and_resets_between_runs(self):
        write(self.tmp / "code" / "lab_fixture_arm.py", "def angle():\n    return 0.5\n")
        write(self.tmp / "tests" / "test_arm.py", textwrap.dedent("""\
            from lab import viz
            from lab_fixture_arm import angle

            def test_draws():
                viz.arm([[angle(), 0.0]])
                assert angle() == 0.5
        """))
        first = test_runner.run_tests(self.tmp / "code", self.tmp / "tests")
        self.assertTrue(first["passed"])
        self.assertEqual(first["viz"][0]["frames"], [[0.5, 0.0]])
        second = test_runner.run_tests(self.tmp / "code", self.tmp / "tests")
        self.assertEqual(len(second["viz"]), 1)  # not doubled up from the first run

    def test_no_viz_key_when_nothing_is_drawn(self):
        write(self.tmp / "code" / "lab_fixture_calc.py", "X = 1\n")
        write(self.tmp / "tests" / "test_calc.py", "from lab_fixture_calc import X\n\ndef test_x():\n    assert X == 1\n")
        self.assertNotIn("viz", test_runner.run_tests(self.tmp / "code", self.tmp / "tests"))


if __name__ == "__main__":
    unittest.main()
