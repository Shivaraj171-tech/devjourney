import unittest

from coach_test_utils import AFTER, BEFORE, good_card

from coach.cards import validate_card
from coach.grounding import ground

G = ground({"file_path": "/p/words.py", "before": BEFORE, "after": AFTER})


class CardValidationTests(unittest.TestCase):
    def assertRejected(self, card, fragment):
        clean, errs = validate_card(card, G)
        self.assertIsNone(clean)
        self.assertTrue(any(fragment in e for e in errs), errs)

    def test_good_card_passes(self):
        clean, errs = validate_card(good_card(), G)
        self.assertEqual(errs, [])
        self.assertEqual(clean["concept"], "dictionaries")

    def test_hallucinated_quote_rejected(self):
        self.assertRejected(good_card(quoted_lines=["counts = defaultdict(int)"]), "quoted line not in diff")

    def test_slightly_edited_quote_rejected(self):
        self.assertRejected(good_card(quoted_lines=["counts[word] = counts.get(word) + 1"]), "quoted line not in diff")

    def test_quote_with_extra_indent_ok(self):
        clean, errs = validate_card(good_card(quoted_lines=["    counts[word] = counts.get(word, 0) + 1"]), G)
        self.assertEqual(errs, [])

    def test_bad_answer_index_rejected(self):
        self.assertRejected(good_card(answer_index=3), "answer_index out of range")
        self.assertRejected(good_card(answer_index=-1), "answer_index out of range")
        self.assertRejected(good_card(answer_index="0"), "answer_index must be an integer")
        self.assertRejected(good_card(answer_index=True), "answer_index must be an integer")

    def test_duplicate_choices_rejected(self):
        self.assertRejected(good_card(choices=["{'a': 2, 'b': 1}", " {'a': 2, 'b': 1} "]), "duplicate choices")

    def test_off_topic_identifiers_rejected(self):
        self.assertRejected(good_card(explanation="`collections.Counter` would count words for you."),
                            "identifiers not in the code")
        self.assertRejected(good_card(explanation="This calls parse_tokens() before counting."),
                            "identifiers not in the code")
        self.assertRejected(good_card(explanation="It works like numpy.bincount on the words."),
                            "identifiers not in the code")

    def test_schema_problems_rejected(self):
        self.assertRejected("not a dict", "not a JSON object")
        c = good_card()
        del c["concept"]
        self.assertRejected(c, "missing fields")
        self.assertRejected(dict(good_card(), extra=1), "unexpected fields")
        self.assertRejected(good_card(concept="wizardry"), "concept not in the allowed list")
        self.assertRejected(good_card(question_kind="essay"), "bad question_kind")
        self.assertRejected(good_card(quoted_lines=[]), "quoted_lines")
        self.assertRejected(good_card(explanation="One. Two. Three. Four."), "1-3 sentences")

    def test_choice_count(self):
        self.assertRejected(good_card(choices=["{'a': 2, 'b': 1}"]), "need 2-4 choices")

    def test_none_kind(self):
        clean, errs = validate_card(good_card(question_kind="none", question="", choices=[],
                                              answer_index=-1, verify_snippet=""), G)
        self.assertEqual(errs, [])
        self.assertEqual(clean["choices"], [])
        self.assertRejected(good_card(question_kind="none"), "no choices")

    def test_spot_line_choices_must_be_diff_lines(self):
        card = good_card(question_kind="spot_line", question="Which line reads the old count?",
                         choices=["counts[word] = counts.get(word, 0) + 1", "counts[word] += 1"],
                         answer_index=0, verify_snippet="")
        self.assertEqual(validate_card(card, G)[1], [])
        card["choices"] = ["counts[word] = counts.get(word, 0) + 1", "counts.update(word)"]
        self.assertRejected(card, "spot_line choice not a diff line")

    def test_why_is_downgraded_unless_allowed(self):
        card = good_card(question_kind="why", question="Why use `get` here?",
                         choices=["It supplies a default of 0", "It sorts the dictionary"],
                         answer_index=0, verify_snippet="")
        clean, errs = validate_card(card, G)
        self.assertEqual(errs, [])
        self.assertEqual(clean["question_kind"], "none")
        clean, _ = validate_card(card, G, allow_why=True)
        self.assertEqual(clean["question_kind"], "why")

    def test_snippet_policy(self):
        self.assertRejected(good_card(verify_snippet="import os\nprint(os.listdir('/'))"), "imports os")
        self.assertRejected(good_card(verify_snippet="print(open('/etc/passwd').read())"), "uses open")
        self.assertRejected(good_card(verify_snippet="print(().__class__.__bases__)"), "touches")
        self.assertRejected(good_card(verify_snippet="x = {}\nx['a'] = 1"), "never prints")
        self.assertRejected(good_card(verify_snippet="print(1 + 1)"), "shares no identifier")
        self.assertRejected(good_card(verify_snippet="print(("), "not valid Python")

    def test_predict_output_only_for_python(self):
        g = ground({"file_path": "/p/a.js", "before": "let counts = {};\n",
                    "after": "let counts = {};\ncounts.word = 1;\n"})
        card = good_card(quoted_lines=["counts.word = 1;"], explanation="`counts.word` sets a property.")
        clean, errs = validate_card(card, g)
        self.assertIsNone(clean)
        self.assertTrue(any("only verifiable for Python" in e for e in errs), errs)


if __name__ == "__main__":
    unittest.main()
