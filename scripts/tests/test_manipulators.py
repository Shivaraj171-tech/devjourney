"""Tests for deep side floors (season.yaml `lesson: long`, `short_title`) in
scripts/validate_content.py, the 3D Lab viewer helpers in lib/runner/lab.py
(`viz.frames3d`, `viz.arm3d`), and the real Manipulators Module 1 floor.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import json
import math
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(REPO_ROOT / "lib" / "runner"))

import lab  # noqa: E402
import validate_content as vc  # noqa: E402
from test_runner_and_validator import make_ticket, write  # noqa: E402
from test_trace_and_bounty import SIDE_TICKET  # noqa: E402

FLOOR = "id: s41\ntitle: Deep\nintro: I\nchain: false\nrequires: s01-t01\n{extra}tickets: [t01]\n"

LONG_LESSON = """\
**A deep lesson**

**Intuition**

Words.

**The maths**

```text
R = [[cos θ, -sin θ], [sin θ, cos θ]]
```

**Worked example**

```python
import math
print(round(math.cos(0.5), 3))
# Output:
# 0.878
```

**Watch out:** units.

**AI check**

Check one pose.
"""


class LongLessonTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.seasons = self.tmp / "seasons"
        write(self.seasons / "s01-a" / "season.yaml", "id: s01\ntitle: T\nintro: I\ntickets: [t01]\n")
        main = make_ticket(self.seasons / "s01-a" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s01-t01", title="Main", concept="numbers", extra=""))
        write(main / "concept.md", "**Numbers**\n\nShort.\n")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def floor(self, lesson, extra="lesson: long\n"):
        write(self.seasons / "s41-deep" / "season.yaml", FLOOR.format(extra=extra))
        t = make_ticket(self.seasons / "s41-deep" / "tickets", "t01", yaml_text=SIDE_TICKET.format(
            tid="s41-t01", title="Deep 1", concept="numbers", extra="").replace("debugging", "robotics"))
        (t / "concept.md").write_text(lesson, encoding="utf-8")
        return vc.validate_content(self.tmp)

    def test_valid_long_lesson(self):
        report = self.floor(LONG_LESSON)
        self.assertEqual(report["s41-deep"], [])
        self.assertEqual(report["s41-deep/t01"], [])

    def test_long_lesson_may_exceed_the_short_limit_but_not_700(self):
        padding = "\n\n" + " ".join(["word"] * 400) + "\n"
        long_text = LONG_LESSON.replace("Words.", "Words." + padding)
        self.assertEqual(self.floor(long_text)["s41-deep/t01"], [])
        # The same lesson without `lesson: long` is too long for a 2-minute lesson.
        shutil.rmtree(self.seasons / "s41-deep")
        errors = self.floor(long_text, extra="")["s41-deep/t01"]
        self.assertTrue(any("at most 230 allowed" in e and "lesson: long" in e for e in errors), errors)
        shutil.rmtree(self.seasons / "s41-deep")
        too_long = LONG_LESSON.replace("Words.", "Words." + padding + padding)
        errors = self.floor(too_long)["s41-deep/t01"]
        self.assertTrue(any("at most 700 allowed" in e for e in errors), errors)

    def test_code_blocks_do_not_count_as_words(self):
        self.assertEqual(vc.lesson_words("one two\n```python\nx = 1 + 2 + 3\n```\nthree\n"), 3)

    def test_sections_are_required_in_order(self):
        errors = self.floor(LONG_LESSON.replace("**AI check**", "**Checks**"))["s41-deep/t01"]
        self.assertTrue(any("missing the **AI check** section" in e for e in errors), errors)
        shutil.rmtree(self.seasons / "s41-deep")
        swapped = LONG_LESSON.replace("**Intuition**", "**TMP**").replace("**The maths**", "**Intuition**").replace("**TMP**", "**The maths**")
        errors = self.floor(swapped)["s41-deep/t01"]
        self.assertTrue(any("sections must come in this order" in e for e in errors), errors)

    def test_worked_example_output_is_checked_by_running_it(self):
        errors = self.floor(LONG_LESSON.replace("# 0.878", "# 0.877"))["s41-deep/t01"]
        self.assertTrue(any("prints '0.878'" in e for e in errors), errors)

    def test_python_blocks_must_run(self):
        broken = LONG_LESSON.replace("print(round(math.cos(0.5), 3))", "print(round(math.cos(0.5), 3))\nprint(1 / 0)")
        errors = self.floor(broken)["s41-deep/t01"]
        self.assertTrue(any("does not run: ZeroDivisionError" in e for e in errors), errors)

    def test_a_worked_example_is_required(self):
        errors = self.floor(LONG_LESSON.replace("# Output:\n# 0.878\n", ""))["s41-deep/t01"]
        self.assertTrue(any("needs a worked example" in e for e in errors), errors)

    def test_lesson_option_values_and_where_it_is_allowed(self):
        errors = self.floor(LONG_LESSON, extra="lesson: huge\n")["s41-deep"]
        self.assertTrue(any("'lesson' must be one of" in e for e in errors), errors)
        season = self.seasons / "s01-a" / "season.yaml"
        season.write_text(season.read_text() + "lesson: long\n")
        report = vc.validate_content(self.tmp)
        self.assertTrue(any("only for side floors" in e for e in report["s01-a"]), report["s01-a"])

    def test_short_title(self):
        self.assertEqual(self.floor(LONG_LESSON, extra='lesson: long\nshort_title: "Deep · M1"\n')["s41-deep"], [])
        shutil.rmtree(self.seasons / "s41-deep")
        errors = self.floor(LONG_LESSON, extra=f'short_title: "{"x" * 50}"\n')["s41-deep"]
        self.assertTrue(any("'short_title' must be a short text" in e for e in errors), errors)


def T(R=((1, 0, 0), (0, 1, 0), (0, 0, 1)), p=(0, 0, 0)):
    return [list(R[0]) + [p[0]], list(R[1]) + [p[1]], list(R[2]) + [p[2]], [0, 0, 0, 1]]


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return ((c, -s, 0), (s, c, 0), (0, 0, 1))


class Frames3DTests(unittest.TestCase):
    def setUp(self):
        lab.reset()

    def test_records_frames_as_top_three_rows(self):
        lab.viz.frames3d("box", [[T(), T(rot_z(i / 10), (0.5, 0, 0))] for i in range(11)], labels=["world", "box"],
                         target=T(rot_z(1.0), (0.5, 0, 0)), points=[(1, 0, 0, "bin")], lines=[((0, 0, 0), (0, 0, 1))], trail=-1)
        item = lab.collect()[0]
        self.assertEqual(item["kind"], "frames3d")
        self.assertEqual(item["style"], "frames")
        self.assertEqual(len(item["frames"]), 11)
        self.assertEqual(item["frames"][0][1], [1.0, -0.0, 0.0, 0.5, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0])
        self.assertEqual(item["links"], [[0, 1]])
        self.assertEqual(item["axes"], [True, True])
        self.assertEqual(item["trail"], 1)
        self.assertEqual(item["points"], [{"x": 1.0, "y": 0.0, "z": 0.0, "label": "bin"}])
        self.assertIn("pose", item["target"])
        self.assertFalse(item["bad_bottom"])
        json.dumps(item)

    def test_one_matrix_or_one_scene_is_one_frame(self):
        lab.viz.frames3d("one", T())
        lab.viz.frames3d("scene", [T(), T(p=(1, 0, 0))])
        one, scene = lab.collect()
        self.assertEqual(len(one["frames"]), 1)
        self.assertEqual(len(scene["frames"]), 1)
        self.assertEqual(len(scene["frames"][0]), 2)

    def test_bad_bottom_row_is_flagged_not_raised(self):
        transposed = [list(r) for r in zip(*T(p=(0.6, 0.2, 0.3)))]  # Byte's inverse
        lab.viz.frames3d("bad", [T(), transposed])
        self.assertTrue(lab.collect()[0]["bad_bottom"])

    def test_shape_errors_are_clear(self):
        with self.assertRaisesRegex(ValueError, "frame 0, transform 0 is not a 4x4 matrix"):
            lab.viz.frames3d("x", [[[1, 0], [0, 1]]])
        with self.assertRaisesRegex(ValueError, "frames is empty"):
            lab.viz.frames3d("x", [])

    def test_arm3d_composes_local_transforms(self):
        link = T(p=(0.5, 0, 0))
        lab.viz.arm3d([[T(rot_z(math.pi / 2)), link, link]])
        item = lab.collect()[0]
        self.assertEqual(item["style"], "arm")
        self.assertEqual(item["labels"], ["base", "joint 1", "joint 2", "gripper"])
        gripper = item["frames"][0][-1]
        self.assertAlmostEqual(gripper[3], 0.0, places=4)  # x
        self.assertAlmostEqual(gripper[7], 1.0, places=4)  # y: two 0.5 links, turned 90° about z
        self.assertEqual(item["axes"], [True, False, False, True])
        self.assertEqual(item["trail"], 3)

    def test_arm3d_can_draw_a_triad_on_every_joint(self):
        link = T(p=(0.5, 0, 0))
        lab.viz.arm3d([[link, link, link]], axes=True, name="all")
        lab.viz.arm3d([[link, link, link]], axes=[True, True], name="some")
        lab.viz.arm3d([[link, link, link]], axes=False, name="none")
        axes = [item["axes"] for item in lab.collect()]
        self.assertEqual(axes, [[True] * 4, [True, True, False, False], [False] * 4])
        # The default is unchanged: base and gripper only.
        lab.reset()
        lab.viz.arm3d([[link, link, link]])
        self.assertEqual(lab.collect()[0]["axes"], [True, False, False, True])

    def test_limits(self):
        many = [[T(p=(i / 1000, j, 0)) for j in range(lab.MAX_TRANSFORMS + 4)] for i in range(1000)]
        lab.viz.frames3d("many", many)
        item = lab.collect()[0]
        self.assertLessEqual(len(item["frames"]), lab.MAX_FRAMES)
        self.assertEqual(len(item["frames"][0]), lab.MAX_TRANSFORMS)
        self.assertTrue(item["truncated"])
        self.assertLessEqual(len(json.dumps(lab.collect())), lab.MAX_JSON)


class RealManipulatorsM1Tests(unittest.TestCase):
    """The real Module 1 floor: 10 lesson tickets and a concept check, opened by the end of Season 1."""

    SEASON = REPO_ROOT / "content" / "seasons" / "s41-manipulators-m1"

    def test_floor(self):
        import yaml

        season = yaml.safe_load((self.SEASON / "season.yaml").read_text())
        self.assertIs(season["chain"], False)
        self.assertEqual(season["requires"], "s01-t10")
        self.assertEqual(season["lesson"], "long")
        self.assertEqual(season["short_title"], "Manipulators · M1")
        self.assertEqual(len(season["tickets"]), 11)
        concepts, right, total, why, formats = set(), 0, 0, 0, 0
        for name in season["tickets"]:
            t = self.SEASON / "tickets" / name
            meta = yaml.safe_load((t / "ticket.yaml").read_text())
            concepts.add(meta["new_concept"])
            self.assertGreaterEqual(len(yaml.safe_load((t / "questions.yaml").read_text())["questions"]), 3, name)
            words = vc.lesson_words((t / "concept.md").read_text())
            self.assertGreater(words, 300, f"{name}: a deep lesson, got {words} words")
            if (t / "byte.yaml").is_file():
                sug = yaml.safe_load((t / "byte.yaml").read_text())["suggestion"]
                total += 1
                right += sug["correct"]
                why += "why" in sug
            formats += (t / "formats.yaml").is_file()
        self.assertEqual(len(concepts), 11)
        self.assertGreaterEqual(total, 5)
        self.assertTrue(0.55 <= right / total <= 0.65, (right, total))
        self.assertGreaterEqual(why, 3)
        self.assertGreaterEqual(formats, 8)
        report = vc.validate_content(REPO_ROOT / "content")
        floor = {k: v for k, v in report.items() if k.startswith("s41-manipulators-m1")}
        self.assertEqual(len(floor), 12)
        self.assertTrue(all(v == [] for v in floor.values()), floor)

    def test_every_code_ticket_draws_in_3d(self):
        for t in sorted((self.SEASON / "tickets").iterdir()):
            if not (t / "tests").is_dir():
                continue
            for folder in ("starter", "solution"):
                result = vc.run_ticket_tests(t / folder, t / "tests")
                kinds = {item["kind"] for item in result.get("viz", [])}
                self.assertIn("frames3d", kinds, f"{t.name}/{folder} drew no 3D frames")
                self.assertLess(len(json.dumps(result["viz"])), lab.MAX_JSON)


class RealManipulatorsM2Tests(unittest.TestCase):
    """The real Module 2 floor (forward kinematics): opens after Module 1's last ticket."""

    SEASON = REPO_ROOT / "content" / "seasons" / "s42-manipulators-m2"

    def test_floor(self):
        import yaml

        season = yaml.safe_load((self.SEASON / "season.yaml").read_text())
        self.assertIs(season["chain"], False)
        self.assertEqual(season["requires"], "s41-t11")  # a SIDE FLOOR's ticket: modules open in sequence
        self.assertEqual(season["lesson"], "long")
        self.assertEqual(season["icon"], "🦾")
        self.assertEqual(season["short_title"], "Manipulators · M2")
        self.assertEqual(len(season["tickets"]), 11)
        concepts, right, total, why, formats, questions, longest = set(), 0, 0, 0, 0, 0, 0
        for name in season["tickets"]:
            t = self.SEASON / "tickets" / name
            meta = yaml.safe_load((t / "ticket.yaml").read_text())
            concepts.add(meta["new_concept"])
            qs = yaml.safe_load((t / "questions.yaml").read_text())["questions"]
            self.assertGreaterEqual(len(qs), 3, name)
            for q in qs:
                questions += 1
                lens = [len(c) for c in q["choices"]]
                longest += lens[q["answer"]] > max(n for i, n in enumerate(lens) if i != q["answer"])
            words = vc.lesson_words((t / "concept.md").read_text())
            self.assertGreater(words, 300, f"{name}: a deep lesson, got {words} words")
            self.assertEqual(len(vc.read_hints(t / "hints.md")), 3, name)
            if (t / "byte.yaml").is_file():
                sug = yaml.safe_load((t / "byte.yaml").read_text())["suggestion"]
                total += 1
                right += sug["correct"]
                why += "why" in sug
            formats += (t / "formats.yaml").is_file()
        self.assertEqual(len(concepts), 11)
        self.assertGreaterEqual(total, 6)
        self.assertTrue(0.55 <= right / total <= 0.65, (right, total))
        self.assertGreaterEqual(why, 3)
        self.assertGreaterEqual(formats, 8)
        self.assertLessEqual(longest, questions // 4, "the right answer is too often the longest choice")
        report = vc.validate_content(REPO_ROOT / "content")
        floor = {k: v for k, v in report.items() if k.startswith("s42-manipulators-m2")}
        self.assertEqual(len(floor), 12)
        self.assertTrue(all(v == [] for v in floor.values()), floor)

    def test_starts_from_module_1s_rigid_package(self):
        m1 = REPO_ROOT / "content" / "seasons" / "s41-manipulators-m1" / "tickets" / "t11-concept-check" / "starter" / "rigid"
        m2 = self.SEASON / "tickets" / "t01-what-is-a-joint" / "starter" / "rigid"
        for f in sorted(m1.glob("*.py")):
            self.assertEqual((m2 / f.name).read_text(), f.read_text(), f.name)

    def test_every_code_ticket_draws_the_arm_with_a_frame_on_every_joint(self):
        for t in sorted((self.SEASON / "tickets").iterdir()):
            if not (t / "tests").is_dir():
                continue
            for folder in ("starter", "solution"):
                result = vc.run_ticket_tests(t / folder, t / "tests")
                arms = [item for item in result.get("viz", []) if item["kind"] == "frames3d" and item["style"] == "arm"]
                self.assertTrue(arms, f"{t.name}/{folder} drew no 3D arm")
                for arm in arms:
                    self.assertTrue(all(arm["axes"][:len(arm["frames"][0])]), f"{t.name}: every joint frame gets a triad")
                self.assertLess(len(json.dumps(result["viz"])), lab.MAX_JSON)

    def test_the_ur5_ticket_draws_six_joint_frames(self):
        t = self.SEASON / "tickets" / "t06-the-ur5"
        result = vc.run_ticket_tests(t / "solution", t / "tests")
        arm = next(item for item in result["viz"] if item["kind"] == "frames3d")
        self.assertEqual(len(arm["frames"][0]), 7)  # the base + six DH frames
        self.assertEqual(arm["labels"][-1], "flange (frame 6)")
        home = arm["frames"][-1][-1]  # the last animation frame ends at home: the flange's position
        self.assertAlmostEqual(home[3], -0.81725, places=4)
        self.assertAlmostEqual(home[7], -0.19145, places=4)


if __name__ == "__main__":
    unittest.main()
