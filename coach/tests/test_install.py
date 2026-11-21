import io
import json
import unittest

from coach_test_utils import TempHome

from coach.install import COACH_DIR, coach_settings, merge, run


class InstallTests(TempHome):
    def settings_file(self):
        return self.project / ".claude" / "settings.json"

    def test_print_only_by_default(self):
        out = io.StringIO()
        self.assertEqual(run(["--project", str(self.project)], out), 0)
        self.assertFalse(self.settings_file().exists())
        text = out.getvalue()
        data = json.loads(text[text.index("{"):])
        self.assertEqual(data["hooks"]["PostToolUse"][0]["matcher"], "Edit|Write")
        self.assertTrue(data["hooks"]["PostToolUse"][0]["hooks"][0]["async"])
        self.assertNotIn("async", data["hooks"]["PreToolUse"][0]["hooks"][0])
        self.assertIn("capture.py", data["hooks"]["Stop"][0]["hooks"][0]["command"])

    def test_merge_keeps_other_keys_and_backs_up(self):
        f = self.settings_file()
        f.parent.mkdir()
        original = {
            "model": "opus",
            "permissions": {"allow": ["Bash(ls)"]},
            "hooks": {"PostToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "lint.sh"}]}]},
            "statusLine": {"type": "command", "command": "my-status.sh"},
        }
        f.write_text(json.dumps(original))
        out = io.StringIO()
        self.assertEqual(run(["--project", str(self.project), "--write"], out), 0)
        merged = json.loads(f.read_text())
        self.assertEqual(merged["model"], "opus")
        self.assertEqual(merged["permissions"], original["permissions"])
        post = merged["hooks"]["PostToolUse"]
        self.assertEqual(post[0]["matcher"], "Bash")  # user's hook kept
        self.assertEqual(post[1]["matcher"], "Edit|Write")
        self.assertEqual(merged["statusLine"]["command"], "my-status.sh")  # not clobbered
        self.assertIn("kept your existing statusLine", out.getvalue())
        backups = list(f.parent.glob("settings.json.coach-backup-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(json.loads(backups[0].read_text()), original)

        # idempotent: running again doesn't duplicate our hooks
        run(["--project", str(self.project), "--write"], io.StringIO())
        again = json.loads(f.read_text())
        self.assertEqual(len(again["hooks"]["PostToolUse"]), 2)
        self.assertEqual(len(again["hooks"]["Stop"]), 1)

        # remove puts it back the way it was (hooks-wise)
        run(["--project", str(self.project), "--write", "--remove"], io.StringIO())
        removed = json.loads(f.read_text())
        self.assertEqual(removed["hooks"], original["hooks"])
        self.assertEqual(removed["statusLine"], original["statusLine"])

    def test_local_settings_and_output_style(self):
        out = io.StringIO()
        run(["--project", str(self.project), "--local", "--write", "--with-output-style"], out)
        local = self.project / ".claude" / "settings.local.json"
        self.assertTrue(local.exists())
        self.assertIn("statusline.py", json.loads(local.read_text())["statusLine"]["command"])
        style = self.project / ".claude" / "output-styles" / "learn-with-coach.md"
        self.assertTrue(style.read_text().startswith("---\nname: Learn with Coach"))
        self.assertIn("keep-coding-instructions: true", style.read_text())

    def test_invalid_json_is_not_touched(self):
        f = self.settings_file()
        f.parent.mkdir()
        f.write_text("{oops")
        out = io.StringIO()
        self.assertEqual(run(["--project", str(self.project), "--write"], out), 1)
        self.assertEqual(f.read_text(), "{oops")

    def test_merge_pure(self):
        ours = coach_settings("/usr/bin/python3", COACH_DIR)
        merged, _ = merge({}, ours)
        self.assertEqual(merged, ours)


if __name__ == "__main__":
    unittest.main()
