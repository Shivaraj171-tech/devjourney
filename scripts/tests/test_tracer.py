"""Tests for lib/runner/tracer.py (the step-through debugger's tracer).

Run from the repo root:
    python3 -m unittest discover -s scripts/tests -v
"""

import shutil
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "lib" / "runner"))

import tracer  # noqa: E402

CART = """\
    def cart_subtotal(prices):
        total = 0
        for i in range(len(prices) - 1):
            total = total + prices[i]
        return total


    def lookup(menu, name):
        return menu[name]


    def forever():
        n = 0
        while True:
            n += 1


    def shout(word):
        print(word.upper())
        helper = len
        return word.upper()


    def safe_lookup(menu, name):
        try:
            return lookup(menu, name)
        except KeyError:
            return None
"""

TESTS = """\
    from app.cart import cart_subtotal, forever, lookup, safe_lookup, shout

    def check(prices, expected):
        result = cart_subtotal(prices)
        assert result == expected, f"should be {expected}, got {result}"

    def test_two_items():
        check([450, 299], 749)

    def test_empty():
        check([], 0)

    def test_missing_key():
        lookup({}, "pizza")

    def test_forever():
        forever()

    def test_shout():
        assert shout("hi") == "HI"

    def test_safe_lookup():
        assert safe_lookup({}, "pizza") is None
"""


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(text), encoding="utf-8")


class TracerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        write(self.tmp / "code" / "app" / "__init__.py", "")
        write(self.tmp / "code" / "app" / "cart.py", CART)
        write(self.tmp / "tests" / "test_cart.py", TESTS)

    def tearDown(self):
        shutil.rmtree(self.tmp)
        for name in list(sys.modules):
            if name == "app" or name.startswith("app.") or name.startswith("_ticket_tests_"):
                del sys.modules[name]

    def trace(self, name, **kw):
        return tracer.trace_test(self.tmp / "code", self.tmp / "tests", "test_cart.py", name, **kw)

    def test_records_lines_and_variables_in_learner_code(self):
        r = self.trace("test_two_items")
        self.assertEqual(r["status"], "fail")
        self.assertEqual(r["message"], "should be 749, got 450")
        steps = r["steps"]
        self.assertEqual([(s["event"], s["line"]) for s in steps], [
            ("call", 1), ("line", 2), ("line", 3), ("line", 4), ("line", 3), ("line", 5), ("return", 5),
        ])
        self.assertTrue(all(s["file"] == "app/cart.py" and s["func"] == "cart_subtotal" for s in steps))
        self.assertEqual(steps[0]["locals"], [["prices", "[450, 299]"]])
        self.assertEqual(dict(steps[4]["locals"]), {"prices": "[450, 299]", "total": "450", "i": "0"})
        self.assertEqual(steps[-1]["value"], "450")
        # The test file's frames give context in the call stack but are not steps.
        self.assertEqual(steps[0]["stack"], ["test_two_items", "check", "cart_subtotal"])
        self.assertFalse(r["truncated"])

    def test_passing_check(self):
        r = self.trace("test_empty")
        self.assertEqual(r["status"], "pass")
        self.assertEqual(r["steps"][-1]["event"], "return")
        self.assertEqual(r["steps"][-1]["value"], "0")

    def test_exception_is_recorded_where_it_is_raised(self):
        r = self.trace("test_missing_key")
        self.assertEqual(r["status"], "error")
        self.assertEqual(r["message"], "KeyError: 'pizza'")
        events = [(s["event"], s["line"]) for s in r["steps"]]
        self.assertEqual(events, [("call", 8), ("line", 9), ("exception", 9), ("unwind", 9)])
        self.assertEqual(r["steps"][2]["exception"], "KeyError: 'pizza'")
        self.assertTrue(r["steps"][2]["raised_here"])

    def test_caught_exception_passes_through_and_is_handled(self):
        r = self.trace("test_safe_lookup")
        self.assertEqual(r["status"], "pass")
        exc = [s for s in r["steps"] if s["event"] == "exception"]
        self.assertEqual([(s["func"], s["raised_here"]) for s in exc], [("lookup", True), ("safe_lookup", False)])
        # safe_lookup caught it, so it returns normally instead of unwinding.
        self.assertEqual(r["steps"][-1]["event"], "return")
        self.assertEqual(r["steps"][-1]["func"], "safe_lookup")
        self.assertEqual(r["steps"][-1]["value"], "None")
        self.assertIn(["safe_lookup", "lookup"], [s["stack"][-2:] for s in r["steps"] if s["func"] == "lookup"])

    def test_infinite_loop_stops_at_step_limit(self):
        r = self.trace("test_forever", max_steps=50)
        self.assertEqual(r["status"], "stopped")
        self.assertTrue(r["truncated"])
        self.assertEqual(len(r["steps"]), 50)
        self.assertIn("loop that never ends", r["message"])
        self.assertIsNone(sys.gettrace())

    def test_stdout_so_far_and_skipped_locals(self):
        r = self.trace("test_shout")
        self.assertEqual(r["status"], "pass")
        self.assertEqual(r["steps"][1]["stdout"], "")
        self.assertEqual(r["steps"][-1]["stdout"], "HI\n")
        self.assertEqual(r["output"], "HI\n")
        # `helper = len` is a builtin function: hidden from the variables table.
        self.assertEqual([n for n, _ in r["steps"][-1]["locals"]], ["word"])

    def test_unknown_test_name(self):
        r = self.trace("test_nope")
        self.assertEqual(r["status"], "error")
        self.assertIn("test_nope", r["message"])
        self.assertEqual(r["steps"], [])


class ReprTest(unittest.TestCase):
    def test_short_repr_truncates(self):
        self.assertLessEqual(len(tracer.short_repr("x" * 500)), tracer.MAX_REPR)
        self.assertLessEqual(len(tracer.short_repr(list(range(1000)))), tracer.MAX_REPR)

    def test_short_repr_survives_broken_repr(self):
        class Bad:
            def __repr__(self):
                raise ValueError("nope")
        self.assertIn("Bad", tracer.short_repr(Bad()))  # no exception escapes

    def test_visible_locals_limits_and_filters(self):
        values = {f"v{i}": i for i in range(30)}
        values["__name__"] = "x"
        values["sys"] = sys
        out = tracer.visible_locals(values)
        self.assertEqual(len(out), tracer.MAX_VARS)
        self.assertNotIn("__name__", [n for n, _ in out])
        self.assertNotIn("sys", [n for n, _ in out])


if __name__ == "__main__":
    unittest.main()
