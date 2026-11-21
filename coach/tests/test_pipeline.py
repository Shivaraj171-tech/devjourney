"""End to end: hook payload -> queue -> FakeLLM -> validation -> sandbox -> cards.jsonl."""

import io
import json
import unittest

from coach_test_utils import AFTER, TempHome, good_card

from coach import capture, config
from coach.llm import FakeLLM, LLMUnavailable
from coach.pipeline import process
from coach.storage import read_json, read_jsonl


def settings(**kw):
    base = dict(max_cards_per_run=10, max_attempts_per_run=10, autoprocess=False)
    base.update(kw)
    return config.Settings(**base)


class PipelineTests(TempHome):
    def capture_edit(self, name="words.py"):
        f = self.project / name
        f.write_text(AFTER)
        capture.main(io.StringIO(json.dumps(self.edit_payload(f, tool_use_id=f"t-{name}"))), self.home)

    def cards(self):
        return read_jsonl(config.paths(self.home).cards)

    def test_good_card_reaches_cards_file(self):
        self.capture_edit()
        llm = FakeLLM([good_card()])
        report = process(self.home, llm, settings())
        self.assertEqual(len(report.cards), 1, report.rejected)
        cards = self.cards()
        self.assertEqual(len(cards), 1)
        self.assertTrue(cards[0]["verified"])
        self.assertEqual(cards[0]["verified_output"], "{'a': 2, 'b': 1}")
        self.assertFalse(config.paths(self.home).queue.exists())
        # The model only ever saw the diff + enclosing function.
        prompt = llm.calls[0][1]["content"]
        self.assertIn("def count_words", prompt)
        self.assertNotIn("def main", prompt)

    def test_only_good_verified_cards_survive(self):
        bad_cards = [
            good_card(quoted_lines=["counts = Counter(text.split())"]),   # hallucinated quote
            good_card(answer_index=1),                                     # wrong answer (sandbox)
            good_card(explanation="`collections.Counter` is faster."),     # off-topic identifier
            good_card(answer_index=7),                                     # bad index
            "this is not json",
        ]
        for i in range(len(bad_cards) + 1):
            self.capture_edit(f"words{i}.py")
        replies = bad_cards + [good_card()]
        llm = FakeLLM(fn=lambda m, s: replies.pop(0))
        report = process(self.home, llm, settings())
        self.assertEqual(len(report.cards), 1)
        self.assertEqual(len(report.rejected), len(bad_cards))
        self.assertEqual(len(self.cards()), 1)
        self.assertEqual(self.cards()[0]["answer_index"], 0)
        reasons = " | ".join("; ".join(r["reasons"]) for r in read_jsonl(config.paths(self.home).rejected))
        for fragment in ["quoted line not in diff", "disagrees", "identifiers not in the code",
                         "out of range", "not JSON"]:
            self.assertIn(fragment, reasons)

    def test_one_card_per_turn_by_default(self):
        self.capture_edit("a.py")
        self.capture_edit("b.py")
        report = process(self.home, FakeLLM([good_card()]), settings(max_cards_per_run=1))
        self.assertEqual(len(report.cards), 1)

    def test_ollama_down_means_no_card_and_status(self):
        self.capture_edit()
        report = process(self.home, FakeLLM([LLMUnavailable("Ollama not reachable at x")]), settings())
        self.assertEqual(report.cards, [])
        self.assertEqual(self.cards(), [])
        status = read_json(config.paths(self.home).status)
        self.assertIn("not reachable", status["message"])
        self.assertEqual(status["level"], "warn")

    def test_empty_queue_does_not_call_llm(self):
        llm = FakeLLM([good_card()])
        report = process(self.home, llm, settings())
        self.assertEqual((report.events, llm.calls), (0, []))

    def test_secret_file_never_reaches_llm(self):
        f = self.project / "secrets.py"
        f.write_text(AFTER)
        capture.main(io.StringIO(json.dumps(self.edit_payload(f))), self.home)
        llm = FakeLLM([good_card()])
        process(self.home, llm, settings())
        self.assertEqual(llm.calls, [])


if __name__ == "__main__":
    unittest.main()
