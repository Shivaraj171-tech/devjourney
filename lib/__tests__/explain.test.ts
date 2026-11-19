import assert from "node:assert/strict";
import { test } from "node:test";
import { listChecks } from "../content/checks.ts";
import { explainResult, findLocation } from "../runner/explain.ts";

const base = { file: "test_x.py", name: "test_a", output: "" };

test("findLocation picks the last frame inside learner code", () => {
  const tb = `Traceback (most recent call last):
  File "/runner/test_runner.py", line 80, in run_tests
  File "/workspace/tests/test_menu.py", line 5, in test_a
  File "/workspace/code/app/menu.py", line 8, in format_price
TypeError: x`;
  assert.deepEqual(findLocation(tb), { file: "app/menu.py", line: 8 });
  assert.equal(findLocation("no frames here"), null);
});

test("explains common errors in plain language", () => {
  const none = explainResult({ ...base, status: "error", message: "AttributeError: 'NoneType' object has no attribute 'upper'", traceback: "" });
  assert.match(none!.summary, /None/);
  const key = explainResult({ ...base, status: "error", message: "KeyError: 'garlic_bread'", traceback: "" });
  assert.match(key!.summary, /'garlic_bread'/);
  const zero = explainResult({ ...base, status: "error", message: "ZeroDivisionError: division by zero", traceback: "" });
  assert.match(zero!.summary, /divided by zero/);
});

test("assertion failures and passes", () => {
  assert.match(explainResult({ ...base, status: "fail", message: "expected 1", traceback: "" })!.summary, /different answer/);
  assert.equal(explainResult({ ...base, status: "pass", message: "", traceback: "" }), null);
});

test("listChecks reads test function names", () => {
  const checks = listChecks({ "test_d.py": "def helper():\n    pass\n\ndef test_exactly_25_is_free():\n    pass\n" });
  assert.deepEqual(checks, [{ file: "test_d.py", name: "test_exactly_25_is_free", label: "exactly 25 is free" }]);
});
