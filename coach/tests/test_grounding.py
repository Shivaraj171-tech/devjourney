import unittest

from coach_test_utils import AFTER, BEFORE

from coach.grounding import GroundingSkip, ground, is_sensitive_path


def ev(path, before, after):
    return {"file_path": path, "before": before, "after": after}


class GroundingTests(unittest.TestCase):
    def test_python_enclosing_function(self):
        g = ground(ev("/p/words.py", BEFORE, AFTER))
        self.assertEqual(g.context_label, "def count_words")
        self.assertIn("def count_words(text):", g.context)
        self.assertNotIn("def main", g.context)
        self.assertIn("counts[word] = counts.get(word, 0) + 1", [l.strip() for l in g.added])
        self.assertIn("if word in counts:", [l.strip() for l in g.removed])

    def test_method_in_class_picks_innermost(self):
        before = "class A:\n    def f(self):\n        return 1\n\n    def g(self):\n        return 2\n"
        after = before.replace("return 2", "return 3")
        g = ground(ev("/p/a.py", before, after))
        self.assertEqual(g.context_label, "def g")

    def test_module_level_change_uses_window(self):
        before = "".join(f"x{i} = {i}\n" for i in range(40))
        after = before.replace("x20 = 20", "x20 = 21")
        g = ground(ev("/p/m.py", before, after))
        self.assertTrue(g.context_label.startswith("lines "))
        self.assertLessEqual(len(g.context.splitlines()), 17)

    def test_other_language_window(self):
        before = "".join(f"const v{i} = {i};\n" for i in range(30))
        after = before.replace("v10 = 10", "v10 = 11")
        g = ground(ev("/p/a.js", before, after))
        self.assertEqual(g.language, "javascript")
        self.assertIn("const v10 = 11;", g.context)

    def test_syntax_error_falls_back_to_window(self):
        g = ground(ev("/p/b.py", "def f(:\n  pass\n", "def f(:\n  return 1\n"))
        self.assertTrue(g.context_label.startswith("lines"))

    def test_secrets_skipped(self):
        for path in ["/p/.env", "/p/.env.local", "/p/server.pem", "/home/u/.ssh/config",
                     "/p/id_ed25519", "/p/config/secrets.yaml", "/p/prod.key"]:
            self.assertTrue(is_sensitive_path(path), path)
            with self.assertRaises(GroundingSkip):
                ground(ev(path, "", "a = 1\n"))
        self.assertFalse(is_sensitive_path("/p/app/environment.py"))

    def test_secret_content_skipped(self):
        with self.assertRaises(GroundingSkip):
            ground(ev("/p/c.py", "", 'TOKEN = "ghp_' + "a" * 36 + '"\n'))
        with self.assertRaises(GroundingSkip):
            ground(ev("/p/c.py", "", "-----BEGIN RSA PRIVATE KEY-----\nabc\n"))

    def test_binary_huge_trivial_skipped(self):
        with self.assertRaises(GroundingSkip):
            ground(ev("/p/x.py", "", "a\x00b"))
        with self.assertRaises(GroundingSkip):
            ground(ev("/p/x.py", "", "x = 1\n" * 100_000))
        with self.assertRaises(GroundingSkip):
            ground(ev("/p/x.py", "x = 1\n", "x = 1   \n"))
        with self.assertRaises(GroundingSkip):
            ground(ev("/p/x.py", "same\n", "same\n"))

    def test_diff_is_capped(self):
        after = "".join(f"y{i} = {i}\n" for i in range(1000))
        g = ground(ev("/p/big.py", "", after))
        self.assertLessEqual(len(g.diff.splitlines()), 121)
        self.assertLessEqual(len(g.context.splitlines()), 80)


if __name__ == "__main__":
    unittest.main()
