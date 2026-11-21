import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

from coach_test_utils import good_card

from coach.verify import run_snippet, verify_card

SANDBOX = os.environ.get("COACH_TEST_SANDBOX", "auto")


class VerifyTests(unittest.TestCase):
    def test_correct_answer_kept(self):
        v = verify_card(good_card(), sandbox=SANDBOX)
        self.assertTrue(v.keep, v.reason)
        self.assertEqual(v.actual, "{'a': 2, 'b': 1}")

    def test_wrong_answer_dropped(self):
        v = verify_card(good_card(answer_index=1), sandbox=SANDBOX)
        self.assertFalse(v.keep)
        self.assertIn("disagrees", v.reason)

    def test_two_matching_choices_dropped(self):
        v = verify_card(good_card(choices=["{'a': 2, 'b': 1}", "`{'a': 2, 'b': 1}`"]), sandbox=SANDBOX)
        self.assertFalse(v.keep)

    def test_non_executable_kinds_pass_through(self):
        self.assertTrue(verify_card({"question_kind": "none"}).keep)

    def test_infinite_loop_times_out(self):
        start = time.monotonic()
        r = run_snippet("while True:\n    pass\n", timeout=1.0, sandbox=SANDBOX)
        self.assertTrue(r.timed_out or not r.ok)
        self.assertLess(time.monotonic() - start, 10)
        v = verify_card(good_card(verify_snippet="while True:\n    pass\nprint(1)"), timeout=1.0, sandbox=SANDBOX)
        self.assertFalse(v.keep)

    def test_file_write_blocked_and_host_untouched(self):
        target = Path(tempfile.gettempdir()) / f"coach-should-not-exist-{os.getpid()}.txt"
        code = f"f = open({str(target)!r}, 'w')\nf.write('x')\nf.close()\nprint('wrote')"
        r = run_snippet(code, sandbox=SANDBOX)
        self.assertFalse(r.ok)
        self.assertNotIn("wrote", r.stdout)
        self.assertFalse(target.exists())

    def test_os_mutation_blocked(self):
        home_marker = Path.home() / f".coach-should-not-exist-{os.getpid()}"
        r = run_snippet(f"import os\nos.mkdir({str(home_marker)!r})\nprint('made')", sandbox=SANDBOX)
        self.assertFalse(r.ok)
        self.assertFalse(home_marker.exists())

    def test_network_blocked(self):
        code = ("import socket\ns = socket.socket()\ns.settimeout(1)\n"
                "s.connect(('1.1.1.1', 80))\nprint('connected')")
        r = run_snippet(code, sandbox=SANDBOX)
        self.assertFalse(r.ok)
        self.assertNotIn("connected", r.stdout)

    def test_subprocess_blocked(self):
        r = run_snippet("import subprocess\nprint(subprocess.run(['echo','hi'], capture_output=True).stdout)",
                        sandbox=SANDBOX)
        self.assertFalse(r.ok)
        self.assertNotIn("hi", r.stdout)

    def test_environment_is_cleared(self):
        os.environ["COACH_SECRET_TEST"] = "leak"
        try:
            r = run_snippet("import os\nprint(os.environ.get('COACH_SECRET_TEST'))", sandbox=SANDBOX)
        finally:
            del os.environ["COACH_SECRET_TEST"]
        self.assertEqual(r.stdout.strip(), "None")

    @unittest.skipIf(sys.platform == "darwin", "macOS does not enforce RLIMIT_AS")
    def test_memory_bomb_fails_cleanly(self):
        r = run_snippet("x = 'a' * (4 * 1024 ** 3)\nprint(len(x))", timeout=2.0, sandbox=SANDBOX)
        self.assertFalse(r.ok)


if __name__ == "__main__":
    unittest.main()
