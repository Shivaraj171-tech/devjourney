"""Manual smoke test: one sample Edit through the whole pipeline with FakeLLM.

    python coach/scripts/demo.py            # FakeLLM (no Ollama needed)
    python coach/scripts/demo.py --ollama   # same sample, but ask your real Ollama model

Uses a throwaway COACH_HOME, so your real XP and cards are untouched.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

BEFORE = '''def count_words(text):
    counts = {}
    for word in text.split():
        if word in counts:
            counts[word] += 1
        else:
            counts[word] = 1
    return counts
'''
OLD = '''        if word in counts:
            counts[word] += 1
        else:
            counts[word] = 1
'''
NEW = "        counts[word] = counts.get(word, 0) + 1\n"

FAKE_CARD = {
    "concept": "dictionaries",
    "explanation": ("`counts.get(word, 0)` returns the current count for `word`, or 0 if the word "
                    "is not in the dictionary yet. Adding 1 and storing it back replaces the "
                    "if/else check with one line."),
    "quoted_lines": ["counts[word] = counts.get(word, 0) + 1"],
    "question_kind": "predict_output",
    "question": "What does this snippet print?",
    "choices": ["{'a': 2, 'b': 1}", "{'a': 1, 'b': 1}", "KeyError: 'a'"],
    "answer_index": 0,
    "verify_snippet": 'counts = {}\nfor word in "a b a".split():\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)\n',
}
WRONG_CARD = dict(FAKE_CARD, answer_index=1)  # the sandbox must catch this one


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ollama", action="store_true", help="use the real Ollama model from your settings")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        os.environ["COACH_HOME"] = str(Path(tmp) / "home")
        os.environ["COACH_AUTOPROCESS"] = "0"
        from coach import capture, config
        from coach.cli import render_card, render_result
        from coach.llm import FakeLLM
        from coach.pipeline import process

        project = Path(tmp) / "project"
        project.mkdir()
        f = project / "words.py"
        f.write_text(BEFORE.replace(OLD, NEW))  # the edit has already happened
        payload = {
            "session_id": "demo", "transcript_path": "", "cwd": str(project),
            "hook_event_name": "PostToolUse", "tool_name": "Edit",
            "tool_input": {"file_path": str(f), "old_string": OLD, "new_string": NEW, "replace_all": False},
            "tool_response": {"success": True}, "tool_use_id": "toolu_demo",
        }
        capture.main(io.StringIO(json.dumps(payload)))
        print(f"captured 1 change into {config.paths().queue.name}")

        settings = config.load_settings()
        if args.ollama:
            llm = None
            print(f"asking Ollama model {settings.model} at {settings.ollama_url} …")
        else:
            llm = FakeLLM([WRONG_CARD, FAKE_CARD])
            settings = config.Settings(max_attempts_per_run=3)
            # a second identical change so the wrong card gets tried first and rejected
            payload2 = dict(payload, tool_use_id="toolu_demo2")
            f2 = project / "words2.py"
            f2.write_text(f.read_text())
            payload2["tool_input"] = dict(payload["tool_input"], file_path=str(f2))
            capture.main(io.StringIO(json.dumps(payload2)))

        report = process(llm=llm, settings=settings)
        for r in report.rejected:
            print(f"REJECTED ({Path(r['file']).name}): {'; '.join(r['reasons'])}")
        if not report.cards:
            print(f"no card. status: {report.status}")
            return 1
        card = report.cards[0]
        print()
        print(render_card(card))
        if card["question_kind"] != "none":
            print()
            print(render_result(card, card["answer_index"], True, 10))
    return 0


if __name__ == "__main__":
    sys.exit(main())
