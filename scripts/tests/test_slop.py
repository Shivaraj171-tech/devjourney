"""Tests for the writing "slop check" in the content validator (docs/writing/style-guide.md).

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import tempfile
import unittest
from pathlib import Path

# Only helpers (not test classes) are imported, so no test runs twice.
from test_runner_and_validator import make_ticket, write

import validate_content as vc

# 40 plain words: long enough to be checked, nothing to flag.
FILLER = ("The kitchen screen shows each order as a ticket with the dish names and the time it came in. "
          "Riders pick up from the counter, and the app tells the customer when the food has left the shop "
          "and when it is close.")

# Two more, so three files can be checked without sharing a 7-word run.
FILLER_B = ("Grabby turns each box on the table before it slides it into a slot on the shelf, and the camera "
            "checks the label faces out. Rosa logs every box that lands crooked, with its number and the angle "
            "it was off by.")
FILLER_C = ("Support reads every email that comes in before lunch, counts the refunds, and forwards the strange "
            "ones to the developers with the screenshots attached. Most of them are about prices, a few about "
            "late riders, one about soup.")


def check(text):
    """(fails, warns) for one Markdown file's prose."""
    _, fails, warns = vc.slop_file(vc.slop_prose_md(text))
    return fails, warns


class SlopFileRules(unittest.TestCase):
    def test_plain_prose_is_clean(self):
        self.assertEqual(check(FILLER), ([], []))

    def test_short_files_are_skipped(self):
        self.assertEqual(check("Fixed! 🎉 Let's go — now!"), ([], []))

    def test_em_and_en_dashes_fail_but_hyphens_and_code_do_not(self):
        fails, _ = check(FILLER + " It works — mostly.")
        self.assertTrue(any("dash" in f for f in fails), fails)
        fails, _ = check(FILLER + " Pages 2–5.")
        self.assertTrue(any("dash" in f for f in fails), fails)
        self.assertEqual(check(FILLER + " A small-order fee, minus 3."), ([], []))
        self.assertEqual(check(FILLER + "\n\n```python\nprint('a — b')\n```\n"), ([], []))
        self.assertEqual(check(FILLER + " Run `echo a — b` once."), ([], []))
        self.assertEqual(check(FILLER + " The bound is $a – b$ here."), ([], []))

    def test_banned_phrases_fail(self):
        for phrase in ("Let's check it.", "This is a crucial step.", "Here's the thing about it.",
                       "Time to delve into loops.", "Awesome work.", "In this lesson we loop."):
            fails, _ = check(FILLER + " " + phrase)
            self.assertTrue(any(f.startswith("banned phrase") for f in fails), (phrase, fails))

    def test_banned_phrases_in_quotes_or_code_are_not_voice(self):
        self.assertEqual(check(FILLER + ' The customer wrote "let\'s just cancel it".'), ([], []))
        self.assertEqual(check(FILLER + " The flag is `unlock_all`."), ([], []))

    def test_robust_is_allowed_as_a_technical_term(self):
        self.assertEqual(check(FILLER + " A robust IK solver damps every step."), ([], []))

    def test_exclamation_density(self):
        fails, _ = check(FILLER + " Done! Shipped!")
        self.assertTrue(any("'!'" in f for f in fails), fails)
        self.assertEqual(check(FILLER + " Done!")[0], [])  # one is not a habit
        # Factorials, != and quoted strings are not tone.
        self.assertEqual(check(FILLER + " 3! is 6 and 4! is 24, and x != y. It prints \"Hi!\" and \"Bye!\"."), ([], []))

    def test_emoji_density_fails_and_any_emoji_warns(self):
        fails, warns = check(FILLER + " Done 🎉 and shipped 🚀.")
        self.assertTrue(any("emoji" in f for f in fails), fails)
        fails, warns = check(FILLER + " Done 🎉.")
        self.assertEqual(fails, [])
        self.assertTrue(any("emoji" in w for w in warns), warns)

    def test_two_rebuttals_fail_one_does_not(self):
        one = " It's not just a bug, it's a habit."
        self.assertEqual(check(FILLER + one)[0], [])
        fails, _ = check(FILLER + one + " This is not a typo, but a design choice.")
        self.assertTrue(any("rebuttal" in f for f in fails), fails)

    def test_colon_density_warns(self):
        colons = " Step one: read it. Step two: run it. Step three: fix it. Then: ship it."
        fails, warns = check(FILLER + colons)
        self.assertEqual(fails, [])
        self.assertTrue(any("colon" in w for w in warns), warns)

    def test_contractions_are_not_quotes(self):
        # Two apostrophes must not hide the words between them.
        _, fails, _ = vc.slop_file(FILLER + " Byte's fix doesn't help, let's see.")
        self.assertTrue(any("let's" in f for f in fails), fails)


class SlopSources(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.content = self.root / "content"

    def tearDown(self):
        shutil.rmtree(self.root)

    def ticket(self, season, name, story=FILLER):
        t = self.content / "seasons" / season / "tickets" / name
        write(t / "story.md", story)
        return t

    def result(self, chat=None):
        return vc.slop_check(self.content, chat)

    def test_story_header_lines_are_not_prose(self):
        self.ticket("s01", "t01", "**From:** Maya — Tech Lead!!\n**Ticket:** BUG-1: Crash! Crash!\n\n" + FILLER)
        self.assertEqual(self.result()["content/seasons/s01/tickets/t01/story.md"]["fails"], [])

    def test_yaml_code_fields_are_skipped_and_prose_is_read(self):
        t = self.ticket("s01", "t01")
        write(t / "formats.yaml", "parsons:\n  - goal: >-\n      " + FILLER + "\n    lines:\n"
              "      - \"    return x — 1  # let's\"\n    distractors:\n      - \"    print('Wow! Wow! Wow!')\"\n")
        self.assertEqual(self.result()["content/seasons/s01/tickets/t01/formats.yaml"]["fails"], [])
        write(t / "byte.yaml", "suggestion:\n  file: app/x.py\n  find: \"a — b\"\n  replace: \"a\"\n"
              f"  says: \"Let's ship it. {FILLER}\"\n")
        fails = self.result()["content/seasons/s01/tickets/t01/byte.yaml"]["fails"]
        self.assertTrue(any("let's" in f for f in fails), fails)

    def test_starter_and_solution_code_are_not_read(self):
        t = self.ticket("s01", "t01")
        write(t / "starter" / "notes.md", FILLER + " Wow! Wow! Let's go — now!")
        self.assertNotIn("content/seasons/s01/tickets/t01/starter/notes.md", self.result())

    def test_team_chat_lines_are_read(self):
        chat = self.root / "lib" / "game" / "teamChat.ts"
        write(chat, 'const x = [\n  { id: "a", from: "sam", text: `Wow! Rematch! ${n} XP!` },\n'
              '  { id: "b", from: "maya", text: "' + FILLER + '" },\n];\n'
              'const BYTE_LINES = {\n  caught: "Fixed! Done!",\n};\n')
        fails = self.result(chat)["lib/game/teamChat.ts"]["fails"]
        self.assertTrue(any("'!'" in f for f in fails), fails)

    def test_same_seven_words_in_three_tickets_warns(self):
        frame = " Read the code if you like, then answer the questions in the Quiz tab."
        for name in ("t01", "t02"):
            self.ticket("s41", name, FILLER + frame)
        self.assertFalse(any("also appears" in w for r in self.result().values() for w in r["warns"]))
        self.ticket("s41", "t03", FILLER + frame)
        warned = [label for label, r in self.result().items() if any("also appears" in w for w in r["warns"])]
        self.assertEqual(len(warned), 3, warned)

    def test_a_tickets_own_files_count_as_one_place(self):
        frame = " Read the code if you like, then answer the questions in the Quiz tab."
        t = self.ticket("s41", "t01", FILLER + frame)
        write(t / "hints.md", FILLER + frame)
        write(t / "concept.md", "**Title**\n\n" + FILLER + frame)
        self.assertFalse(any("also appears" in w for r in self.result().values() for w in r["warns"]))

    def test_the_same_lesson_heading_in_more_than_three_lessons_warns(self):
        for i in range(1, 5):
            t = self.ticket("s41", f"t0{i}")
            write(t / "concept.md", f"**Lesson {i}**\n\n**Watch out**\n\n{FILLER}\n\n**Heading {i}**\n\nWords.\n")
        r = self.result()
        self.assertTrue(any("heading 'watch out' is in 4 lessons" in w
                            for w in r["content/seasons/s41/tickets/t01/concept.md"]["warns"]))
        self.assertFalse(any("heading 'heading 1'" in w for x in r.values() for w in x["warns"]))

    def test_summary_counts_fail_warn_and_clean(self):
        self.ticket("s01", "t01")
        self.ticket("s01", "t02", FILLER_B + " Done 🎉.")
        self.ticket("s01", "t03", FILLER_C + " Let's go.")
        self.ticket("s01", "t04", "Too short to check!")
        self.assertEqual(vc.slop_summary(self.result()), (3, 1, 1, 1))


class SlopInTheValidator(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_a_failing_file_fails_the_slop_label(self):
        season = self.tmp / "seasons" / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        t = make_ticket(season / "tickets", "t01")
        report = vc.validate_content(self.tmp)
        self.assertEqual(report["slop/check"], [])
        write(t / "story.md", FILLER + " Hi team! 👋 Big news! 🎉 It's live — finally!")
        errors = vc.validate_content(self.tmp)["slop/check"]
        self.assertTrue(any(e.startswith("content/seasons/s99/tickets/t01/story.md: em/en dash") for e in errors), errors)
        self.assertTrue(any("emoji" in e for e in errors), errors)
        self.assertEqual(report["s99/t01"], [])  # the ticket itself is still valid

    def test_real_content_passes_the_slop_check(self):
        result = vc.slop_check(vc.REPO_ROOT / "content", vc.REPO_ROOT / "lib" / "game" / "teamChat.ts")
        fails = {label: r["fails"] for label, r in result.items() if r["fails"]}
        self.assertEqual(fails, {})


if __name__ == "__main__":
    unittest.main()
