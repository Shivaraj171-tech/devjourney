import io
import json
import os
import subprocess
import sys
import time
import unittest

from coach_test_utils import AFTER, BEFORE, REPO_ROOT, TempHome

from coach import capture, config
from coach.storage import read_jsonl


def run_hook(payload_text: str, home) -> subprocess.CompletedProcess:
    env = dict(os.environ, COACH_HOME=str(home), COACH_AUTOPROCESS="0")
    return subprocess.run([sys.executable, str(REPO_ROOT / "coach" / "capture.py")],
                          input=payload_text, capture_output=True, text=True, env=env,
                          cwd=str(REPO_ROOT.parent), timeout=20)


class CaptureTests(TempHome):
    def queue(self):
        return read_jsonl(config.paths(self.home).queue)

    def test_edit_event_reconstructs_before(self):
        f = self.project / "words.py"
        f.write_text(AFTER)  # PostToolUse runs after the edit landed
        self.assertEqual(capture.main(io.StringIO(json.dumps(self.edit_payload(f))), self.home), 0)
        q = self.queue()
        self.assertEqual(len(q), 1)
        self.assertEqual(q[0]["tool"], "Edit")
        self.assertEqual(q[0]["before"], BEFORE)
        self.assertEqual(q[0]["after"], AFTER)

    def test_edit_stale_file_is_skipped(self):
        f = self.project / "words.py"
        f.write_text("something else entirely\n")
        capture.main(io.StringIO(json.dumps(self.edit_payload(f))), self.home)
        self.assertEqual(self.queue(), [])

    def test_write_new_file(self):
        f = self.project / "new.py"
        capture.main(io.StringIO(json.dumps(self.write_payload(f, "x = 1\n", "PreToolUse"))), self.home)
        f.write_text("x = 1\n")
        capture.main(io.StringIO(json.dumps(self.write_payload(f, "x = 1\n"))), self.home)
        q = self.queue()
        self.assertEqual(len(q), 1)
        self.assertEqual(q[0]["before"], "")
        self.assertTrue(q[0]["before_known"])

    def test_write_overwrite_uses_snapshot(self):
        f = self.project / "words.py"
        f.write_text(BEFORE)
        capture.main(io.StringIO(json.dumps(self.write_payload(f, AFTER, "PreToolUse"))), self.home)
        f.write_text(AFTER)
        capture.main(io.StringIO(json.dumps(self.write_payload(f, AFTER))), self.home)
        q = self.queue()
        self.assertEqual(q[0]["before"], BEFORE)
        self.assertEqual(q[0]["after"], AFTER)
        self.assertEqual(list(config.paths(self.home).snapshots.iterdir()), [])  # consumed

    def test_secret_files_never_stored(self):
        f = self.project / ".env"
        f.write_text("API_KEY=abc\n")
        capture.main(io.StringIO(json.dumps(self.write_payload(f, "API_KEY=abc\n", "PreToolUse"))), self.home)
        capture.main(io.StringIO(json.dumps(self.write_payload(f, "API_KEY=abc\n"))), self.home)
        self.assertEqual(self.queue(), [])
        snaps = config.paths(self.home).snapshots
        self.assertFalse(snaps.exists() and any(snaps.iterdir()))

    def test_other_tools_ignored(self):
        payload = {"hook_event_name": "PostToolUse", "tool_name": "Bash", "tool_input": {"command": "ls"}}
        capture.main(io.StringIO(json.dumps(payload)), self.home)
        self.assertEqual(self.queue(), [])

    def test_malformed_stdin_subprocess_silent_exit_zero(self):
        for text in ["{not json", "", "[1,2,3]", json.dumps({"hook_event_name": "PostToolUse",
                                                             "tool_name": "Edit", "tool_input": None})]:
            r = run_hook(text, self.home)
            self.assertEqual(r.returncode, 0, text)
            self.assertEqual(r.stdout, "", text)
        self.assertTrue(config.paths(self.home).errors.exists())

    def test_edit_subprocess_silent(self):
        f = self.project / "words.py"
        f.write_text(AFTER)
        r = run_hook(json.dumps(self.edit_payload(f)), self.home)
        self.assertEqual((r.returncode, r.stdout), (0, ""))
        self.assertEqual(len(self.queue()), 1)

    def test_stop_spawns_background_processor(self):
        f = self.project / "words.py"
        f.write_text(AFTER)
        capture.main(io.StringIO(json.dumps(self.edit_payload(f))), self.home)
        env = dict(os.environ, COACH_HOME=str(self.home), COACH_AUTOPROCESS="1",
                   COACH_OLLAMA_URL="http://127.0.0.1:9", COACH_TIMEOUT="2")
        start = time.monotonic()
        r = subprocess.run([sys.executable, str(REPO_ROOT / "coach" / "capture.py")],
                           input=json.dumps({"hook_event_name": "Stop", "session_id": "s1"}),
                           capture_output=True, text=True, env=env, timeout=20)
        self.assertEqual((r.returncode, r.stdout), (0, ""))
        self.assertLess(time.monotonic() - start, 5)  # returns without waiting for the LLM
        status = config.paths(self.home).status
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline and not status.exists():
            time.sleep(0.2)
        self.assertIn("not reachable", json.loads(status.read_text())["message"])
        self.assertFalse(config.paths(self.home).queue.exists())

    def test_stop_without_queue_does_not_spawn(self):
        self.assertFalse(capture.spawn_processor(config.paths(self.home)))
        r = run_hook(json.dumps({"hook_event_name": "Stop", "session_id": "s1",
                                 "stop_hook_active": False, "last_assistant_message": "done"}), self.home)
        self.assertEqual((r.returncode, r.stdout), (0, ""))


if __name__ == "__main__":
    unittest.main()
