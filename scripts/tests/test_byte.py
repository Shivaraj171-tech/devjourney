"""Tests for byte.yaml (Byte's suggestions and prompt cards) in the content validator.

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import tempfile
import textwrap
import unittest
from pathlib import Path

# Only helpers (not test classes) are imported, so no test runs twice.
from test_runner_and_validator import GOOD_YAML, make_ticket, write
from test_review_incident import make_review_ticket

import validate_content as vc

# make_ticket's starter is "return x + 2" (fails), its solution "return x * 2" (passes).
RIGHT_SUGGESTION = """\
    suggestion:
      file: app/calc.py
      find: "    return x + 2"
      replace: "    return x * 2"
      correct: true
      says: "Doubling is times two."
      explain: "x * 2 doubles x."
"""
WRONG_SUGGESTION = """\
    suggestion:
      file: app/calc.py
      find: "    return x + 2"
      replace: "    return x + x + 0 + 1"
      correct: false
      says: "Add it to itself!"
      explain: "The + 1 is wrong."
"""
PROMPT = """\
    prompt:
      goal: "Fix double"
      options:
        - prompt: "fix it"
          response_code: "def double(x):\\n    return x\\n"
          verdict: vague
          feedback: "Too vague."
        - prompt: "double(x) must return x times two"
          response_code: "def double(x):\\n    return x * 2\\n"
          verdict: good
          feedback: "Clear."
      best: 1
"""


def byte_yaml(t, text):
    write(t / "byte.yaml", text)


class ByteYamlTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def meta_errors(self, t):
        return vc.check_ticket_meta(t)

    def all_errors(self, t):
        errors = vc.check_ticket_meta(t)
        if not errors:
            errors += vc.check_byte_suggestion_tests(t)
        return errors

    def test_honest_correct_suggestion_is_valid(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, RIGHT_SUGGESTION)
        self.assertEqual(self.all_errors(t), [])

    def test_honest_wrong_suggestion_is_valid(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, WRONG_SUGGESTION)
        self.assertEqual(self.all_errors(t), [])

    def test_correct_true_that_fails_the_tests_is_caught(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, WRONG_SUGGESTION.replace("correct: false", "correct: true"))
        errors = self.all_errors(t)
        self.assertEqual(len(errors), 1)
        self.assertIn("correct: true", errors[0])
        self.assertIn("fails the tests", errors[0])

    def test_correct_false_that_passes_the_tests_is_caught(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, RIGHT_SUGGESTION.replace("correct: true", "correct: false"))
        errors = self.all_errors(t)
        self.assertEqual(len(errors), 1)
        self.assertIn("passes every test", errors[0])

    def test_find_must_appear_exactly_once(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, RIGHT_SUGGESTION.replace('find: "    return x + 2"', 'find: "return x - 2"'))
        self.assertTrue(any("exactly once" in e and "0 time" in e for e in self.meta_errors(t)))
        t2 = make_ticket(self.root, "t02", starter_code="def double(x):\n    return x + 2\n\n# return x + 2\n")
        byte_yaml(t2, RIGHT_SUGGESTION.replace('find: "    return x + 2"', 'find: "return x + 2"'))
        self.assertTrue(any("exactly once" in e and "2 time" in e for e in self.meta_errors(t2)))

    def test_replacement_must_compile(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, RIGHT_SUGGESTION.replace('replace: "    return x * 2"', 'replace: "    return x *"'))
        self.assertTrue(any("not valid Python" in e for e in self.meta_errors(t)))

    def test_suggestion_fields_and_file(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, RIGHT_SUGGESTION.replace("correct: true", "correct: maybe").replace(
            '      says: "Doubling is times two."\n', ""))
        errors = self.meta_errors(t)
        self.assertTrue(any("'says' is missing" in e for e in errors))
        self.assertTrue(any("'correct' must be true or false" in e for e in errors))

        t2 = make_ticket(self.root, "t02", extra_starter={"app/other.py": "x = 1\n"})
        byte_yaml(t2, RIGHT_SUGGESTION.replace("file: app/calc.py", "file: app/other.py"))
        self.assertTrue(any("not in files_editable" in e for e in self.meta_errors(t2)))

        t3 = make_ticket(self.root, "t03")
        byte_yaml(t3, RIGHT_SUGGESTION.replace('"    return x * 2"', '"    return x + 2"'))
        self.assertTrue(any("same as 'find'" in e for e in self.meta_errors(t3)))

    def test_no_suggestions_on_review_tickets(self):
        t = make_review_ticket(self.root, "t01")
        byte_yaml(t, RIGHT_SUGGESTION)
        self.assertTrue(any("only tickets with tests" in e for e in self.meta_errors(t)))

    def test_prompt_card_valid_alone_and_with_a_suggestion(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, PROMPT)
        self.assertEqual(self.all_errors(t), [])
        t2 = make_ticket(self.root, "t02")
        byte_yaml(t2, WRONG_SUGGESTION + PROMPT)
        self.assertEqual(self.all_errors(t2), [])
        # Prompt cards are fine on review tickets too.
        t3 = make_review_ticket(self.root, "t03")
        byte_yaml(t3, PROMPT)
        self.assertEqual(self.meta_errors(t3), [])

    def test_prompt_best_and_verdicts(self):
        cases = {
            "best: 1": ("best: 5", "out of range"),
            "verdict: vague": ("verdict: meh", "must be one of"),
        }
        for i, (old, (new, message)) in enumerate(cases.items()):
            t = make_ticket(self.root, f"t{i}")
            byte_yaml(t, PROMPT.replace(old, new, 1))
            errors = self.meta_errors(t)
            self.assertTrue(any(message in e for e in errors), errors)

        t = make_ticket(self.root, "best-not-good")
        byte_yaml(t, PROMPT.replace("best: 1", "best: 0"))
        errors = self.meta_errors(t)
        self.assertTrue(any("must have verdict 'good'" in e for e in errors), errors)
        self.assertTrue(any("only the best option" in e for e in errors), errors)

    def test_prompt_option_count_and_code(self):
        t = make_ticket(self.root, "one-option")
        one = PROMPT.split("        - prompt: \"double(x)")[0] + "      best: 0\n"
        byte_yaml(t, one.replace("verdict: vague", "verdict: good"))
        self.assertTrue(any("needs 2-4" in e for e in self.meta_errors(t)))

        t2 = make_ticket(self.root, "bad-code")
        byte_yaml(t2, PROMPT.replace('"def double(x):\\n    return x\\n"', '"def double(x)\\n"'))
        self.assertTrue(any("response_code is not valid Python" in e for e in self.meta_errors(t2)))

        t3 = make_ticket(self.root, "dupe")
        byte_yaml(t3, PROMPT.replace('"double(x) must return x times two"', '"fix it"'))
        self.assertTrue(any("all be different" in e for e in self.meta_errors(t3)))

    def test_byte_yaml_shape(self):
        t = make_ticket(self.root, "t01")
        byte_yaml(t, "hello: there\n")
        errors = self.meta_errors(t)
        self.assertTrue(any("unknown section" in e for e in errors))
        self.assertTrue(any("needs a 'suggestion' or a 'prompt'" in e for e in errors))
        t2 = make_ticket(self.root, "t02")
        byte_yaml(t2, "- a list\n")
        self.assertTrue(any("must be a mapping" in e for e in self.meta_errors(t2)))
        t3 = make_ticket(self.root, "t03")
        byte_yaml(t3, "suggestion: [unclosed\n")
        self.assertTrue(any("not valid YAML" in e for e in self.meta_errors(t3)))

    def test_validate_season_runs_the_honesty_check(self):
        season = self.root / "s99"
        write(season / "season.yaml", "id: s99\ntitle: T\nintro: I\ntickets: [t01]\n")
        t = make_ticket(season / "tickets", "t01")
        byte_yaml(t, RIGHT_SUGGESTION.replace("correct: true", "correct: false"))
        # validate_season runs the starter's tests first, which leaves a __pycache__ in starter/.
        # The replacement is the same size as the text it replaces, so a copied .pyc would look
        # up to date and hide the change: the honesty check must not copy it.
        report = vc.validate_season(season)
        self.assertTrue(any("passes every test" in e for e in report["s99/t01"]), report)

    def test_real_content_has_byte_suggestions_and_prompts(self):
        files = list((vc.REPO_ROOT / "content" / "seasons").glob("*/tickets/*/byte.yaml"))
        data = [vc.load_byte(f.parent) for f in files]
        suggestions = [d["suggestion"] for d in data if "suggestion" in d]
        self.assertGreaterEqual(len(suggestions), 6)
        self.assertTrue(any(s["correct"] for s in suggestions))
        self.assertTrue(any(not s["correct"] for s in suggestions))
        self.assertGreaterEqual(sum(1 for d in data if "prompt" in d), 4)


if __name__ == "__main__":
    unittest.main()


# A ticket with two separate bugs, so Byte can fix just one of them (partial: true).
TWO_BUG_STARTER = """\
def double(x):
    return x + 2


def half(x):
    return x - 2


def triple(x):
    return x * 3
"""
TWO_BUG_SOLUTION = TWO_BUG_STARTER.replace("return x + 2", "return x * 2").replace("return x - 2", "return x // 2")
TWO_BUG_TESTS = """\
from app.calc import double, half, triple


def test_double():
    assert double(5) == 10


def test_half():
    assert half(10) == 5


def test_triple_already_works():
    assert triple(2) == 6
"""
PARTIAL = """\
suggestion:
  file: app/calc.py
  find: "    return x + 2"
  replace: "    return x * 2"
  correct: true
  partial: true
  says: "Fixed double for you; half is yours."
  explain: "double is right now, half still subtracts."
"""


class PartialSuggestionTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def ticket(self, byte_text):
        t = make_ticket(self.root, "t01")
        (t / "tests" / "test_calc.py").write_text(TWO_BUG_TESTS, encoding="utf-8")
        (t / "starter" / "app" / "calc.py").write_text(TWO_BUG_STARTER, encoding="utf-8")
        (t / "solution" / "app" / "calc.py").write_text(TWO_BUG_SOLUTION, encoding="utf-8")
        write(t / "byte.yaml", byte_text)
        return t

    def errors(self, t):
        errors = vc.check_ticket_meta(t)
        if not errors:
            errors += vc.check_ticket_tests(t) + vc.check_byte_suggestion_tests(t)
        return errors

    def test_honest_partial_suggestion_is_valid(self):
        self.assertEqual(self.errors(self.ticket(PARTIAL)), [])

    def test_partial_without_partial_flag_fails_as_correct(self):
        errors = self.errors(self.ticket(PARTIAL.replace("  partial: true\n", "")))
        self.assertTrue(any("correct: true" in e and "fails the tests" in e for e in errors), errors)

    def test_partial_that_fixes_everything_is_caught(self):
        text = PARTIAL.replace('find: "    return x + 2"', 'find: "    return x + 2\\n\\n\\ndef half(x):\\n    return x - 2"') \
                      .replace('replace: "    return x * 2"', 'replace: "    return x * 2\\n\\n\\ndef half(x):\\n    return x // 2"')
        errors = self.errors(self.ticket(text))
        self.assertTrue(any("passes every test" in e for e in errors), errors)

    def test_partial_that_fixes_nothing_is_caught(self):
        errors = self.errors(self.ticket(PARTIAL.replace('replace: "    return x * 2"', 'replace: "    return x + 3"')))
        self.assertTrue(any("doesn't make any more tests pass" in e for e in errors), errors)

    def test_partial_that_breaks_a_passing_test_is_caught(self):
        text = PARTIAL.replace('find: "    return x + 2"', 'find: "    return x + 2\\n\\n\\ndef half(x):\\n    return x - 2\\n\\n\\ndef triple(x):\\n    return x * 3"') \
                      .replace('replace: "    return x * 2"', 'replace: "    return x * 2\\n\\n\\ndef half(x):\\n    return x - 2\\n\\n\\ndef triple(x):\\n    return x * 4"')
        errors = self.errors(self.ticket(text))
        self.assertTrue(any("breaks tests that passed before" in e and "test_triple_already_works" in e for e in errors), errors)

    def test_partial_needs_correct_true_and_a_boolean(self):
        errors = vc.check_ticket_meta(self.ticket(PARTIAL.replace("correct: true", "correct: false")))
        self.assertTrue(any("only goes with 'correct: true'" in e for e in errors), errors)
        errors = vc.check_ticket_meta(self.ticket(PARTIAL.replace("partial: true", "partial: sometimes")))
        self.assertTrue(any("'partial' must be true or false" in e for e in errors), errors)


class TutorialFlagTests(unittest.TestCase):
    """ticket.yaml `tutorial: true`: a practice Byte decision, left out of the human-in-the-loop score."""

    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def ticket(self, flag="tutorial: true", byte=RIGHT_SUGGESTION):
        t = make_ticket(self.root, "t01", yaml_text=GOOD_YAML + f"    {flag}\n")
        if byte is not None:
            byte_yaml(t, byte)
        return t

    def test_tutorial_with_a_suggestion_is_valid(self):
        self.assertEqual(vc.check_ticket_meta(self.ticket()), [])

    def test_tutorial_must_be_true(self):
        errors = vc.check_ticket_meta(self.ticket("tutorial: yes please"))
        self.assertTrue(any("'tutorial' must be true" in e for e in errors), errors)
        errors = vc.check_ticket_meta(self.ticket("tutorial: false"))
        self.assertTrue(any("'tutorial' must be true" in e for e in errors), errors)

    def test_tutorial_needs_a_byte_suggestion(self):
        errors = vc.check_ticket_meta(self.ticket(byte=None))
        self.assertTrue(any("needs a byte.yaml suggestion" in e for e in errors), errors)
        errors = vc.check_ticket_meta(self.ticket(byte=PROMPT))
        self.assertTrue(any("needs a byte.yaml suggestion" in e for e in errors), errors)

    def test_tutorial_not_in_side_quests(self):
        errors = vc.check_ticket_meta(self.ticket(), side_quest=True)
        self.assertTrue(any("not allowed in the final exam or a side quest" in e for e in errors), errors)

    def test_real_content_marks_the_first_two_tickets(self):
        import yaml
        root = Path(__file__).resolve().parents[2] / "content" / "seasons" / "s01-first-week" / "tickets"
        flagged = sorted(d.name for d in root.iterdir() if (yaml.safe_load((d / "ticket.yaml").read_text()) or {}).get("tutorial"))
        self.assertEqual(flagged, ["t01-welcome", "t02-menu-prices"])


# ---------- Byte's calibration (curriculum audit): verify, don't reject by habit ----------

MAIN_SEASONS = ("s01", "s02", "s03", "s04", "s05")
# Byte should be fully right (not partial) in roughly half to 60% of its main-story suggestions,
# and never in under 40% of a season's, so "always reject" is no strategy.
RIGHT_SHARE_OVERALL = (0.5, 0.6)
RIGHT_SHARE_PER_SEASON = 0.4


def real_suggestions(prefixes):
    """(season prefix, ticket name, suggestion) for every real byte.yaml suggestion in those seasons."""
    out = []
    for path in sorted((vc.REPO_ROOT / "content" / "seasons").glob("*/tickets/*/byte.yaml")):
        season = path.parents[2].name[:3]
        sug = (vc.load_byte(path.parent) or {}).get("suggestion")
        if season in prefixes and sug:
            out.append((season, path.parent.name, sug))
    return out


def fully_right(sug):
    return sug["correct"] is True and not sug.get("partial")


def mean_length(texts):
    return sum(len(t) for t in texts) / len(texts)


def share_with_bang(texts):
    return sum("!" in t for t in texts) / len(texts)


class ByteCalibrationTests(unittest.TestCase):
    def setUp(self):
        self.main = real_suggestions(MAIN_SEASONS)

    def test_byte_is_right_about_half_the_time_in_the_main_story(self):
        share = sum(fully_right(s) for _, _, s in self.main) / len(self.main)
        low, high = RIGHT_SHARE_OVERALL
        self.assertTrue(low <= share <= high, f"Byte is fully right in {share:.0%} of S1-S5 suggestions")

    def test_no_season_teaches_always_reject(self):
        for season in MAIN_SEASONS:
            sugs = [s for p, _, s in self.main if p == season]
            share = sum(fully_right(s) for s in sugs) / len(sugs)
            self.assertGreaterEqual(share, RIGHT_SHARE_PER_SEASON, f"{season}: Byte fully right in {share:.0%}")

    def test_tone_and_length_do_not_give_the_answer_away(self):
        """Byte sounds just as sure, and says about as much, whether it's right or wrong."""
        right = [s["says"] for _, _, s in self.main if fully_right(s)]
        wrong = [s["says"] for _, _, s in self.main if not s["correct"]]
        ratio = mean_length(right) / mean_length(wrong)
        self.assertTrue(0.8 <= ratio <= 1.25, f"right pitches are {ratio:.2f}x as long as wrong ones")
        self.assertLessEqual(abs(share_with_bang(right) - share_with_bang(wrong)), 0.25,
                             "'!' marks only one kind of pitch")

    def test_real_whys_pass_the_longest_reason_check(self):
        self.assertEqual(vc.check_byte_why_lengths(vc.REPO_ROOT / "content" / "seasons"), [])


class ByteWhyLengthTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.root)

    def season_with_whys(self, answers_longest):
        seasons = self.root / "seasons"
        for n, longest in enumerate(answers_longest):
            right = "the right reason, said at some length" if longest else "the right one"
            t = seasons / "s01" / "tickets" / f"t{n:02d}"
            t.mkdir(parents=True)
            byte_yaml(t, textwrap.dedent(f"""\
                suggestion:
                  file: app/calc.py
                  find: "x"
                  replace: "y"
                  correct: true
                  says: "s"
                  explain: "e"
                  why:
                    choices: ["{right}", "a decoy reason here", "another decoy"]
                    answer: 0
            """))
        return seasons

    def test_right_reason_longest_too_often_fails(self):
        errors = vc.check_byte_why_lengths(self.season_with_whys([True, True, False, False]))
        self.assertTrue(any("strictly longest choice in 2 of 4" in e for e in errors), errors)

    def test_right_reason_longest_sometimes_is_fine(self):
        self.assertEqual(vc.check_byte_why_lengths(self.season_with_whys([True, False, False, False])), [])
