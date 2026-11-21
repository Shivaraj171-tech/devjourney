"""Shared fixtures for the coach tests (not a test module itself)."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

BEFORE = '''import sys


def count_words(text):
    counts = {}
    for word in text.split():
        if word in counts:
            counts[word] += 1
        else:
            counts[word] = 1
    return counts


def main():
    print(count_words(sys.stdin.read()))
'''

OLD_STRING = '''        if word in counts:
            counts[word] += 1
        else:
            counts[word] = 1
'''
NEW_STRING = '''        counts[word] = counts.get(word, 0) + 1
'''
AFTER = BEFORE.replace(OLD_STRING, NEW_STRING)

GOOD_SNIPPET = '''counts = {}
for word in "a b a".split():
    counts[word] = counts.get(word, 0) + 1
print(counts)
'''


def good_card(**overrides) -> dict:
    card = {
        "concept": "dictionaries",
        "explanation": ("`counts.get(word, 0)` returns the current count for `word`, or 0 if the "
                        "word is not in the dictionary yet. Adding 1 and storing it back replaces "
                        "the if/else check with one line."),
        "quoted_lines": ["counts[word] = counts.get(word, 0) + 1"],
        "question_kind": "predict_output",
        "question": "What does this snippet print?",
        "choices": ["{'a': 2, 'b': 1}", "{'a': 1, 'b': 1}", "KeyError"],
        "answer_index": 0,
        "verify_snippet": GOOD_SNIPPET,
    }
    card.update(overrides)
    return card


class TempHome(unittest.TestCase):
    """Gives each test its own COACH_HOME and a project dir."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.home = self.root / "coach-home"
        self.project = self.root / "project"
        self.project.mkdir()
        self._old_env = {k: os.environ.get(k) for k in ("COACH_HOME", "COACH_AUTOPROCESS", "HOME")}
        os.environ["COACH_HOME"] = str(self.home)
        os.environ["COACH_AUTOPROCESS"] = "0"

    def tearDown(self):
        for k, v in self._old_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        self._tmp.cleanup()

    def edit_payload(self, file_path: Path, old=OLD_STRING, new=NEW_STRING, **extra) -> dict:
        payload = {
            "session_id": "s1", "transcript_path": str(self.root / "t.jsonl"),
            "cwd": str(self.project), "hook_event_name": "PostToolUse", "tool_name": "Edit",
            "tool_input": {"file_path": str(file_path), "old_string": old, "new_string": new,
                           "replace_all": False},
            "tool_response": {"filePath": str(file_path), "success": True},
            "tool_use_id": "toolu_edit_1",
        }
        payload.update(extra)
        return payload

    def write_payload(self, file_path: Path, content: str, event="PostToolUse", tool_use_id="toolu_w1") -> dict:
        p = {
            "session_id": "s1", "transcript_path": str(self.root / "t.jsonl"),
            "cwd": str(self.project), "hook_event_name": event, "tool_name": "Write",
            "tool_input": {"file_path": str(file_path), "content": content},
            "tool_use_id": tool_use_id,
        }
        if event == "PostToolUse":
            p["tool_response"] = {"filePath": str(file_path), "success": True}
        return p
