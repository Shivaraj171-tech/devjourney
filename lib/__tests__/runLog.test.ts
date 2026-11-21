import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RUN_LOG_CAP,
  appendRun,
  cleanRunLog,
  codeHash,
  entryPassed,
  errorKind,
  isBoundaryCheck,
  lineHash,
  runEntry,
  type RunLike,
  type RunLogEntry,
} from "../game/runLog.ts";

const tb = (file: string, line: number) => `Traceback (most recent call last):\n  File "/workspace/code/${file}", line ${line}, in reorder\n`;
const crash = (name: string, message: string, file = "app/reorder.py", line = 3) => ({ file: "test_reorder.py", name, status: "error" as const, message, traceback: tb(file, line) });
const fail = (name: string) => ({ file: "test_reorder.py", name, status: "fail" as const, message: "expected 1, got 2", traceback: "" });
const pass = (name: string) => ({ file: "test_reorder.py", name, status: "pass" as const, message: "", traceback: "" });
const CODE = { "app/reorder.py": "def reorder(items, menu):\n    out = []\n    for i in items: out.append(menu[i])\n    return out\n" };

test("error kinds come from the exception name only, with sharper kinds for None and asserts", () => {
  assert.equal(errorKind(crash("t", "KeyError: 'garlic_bread'")), "KeyError");
  assert.equal(errorKind(crash("t", "AttributeError: 'NoneType' object has no attribute 'upper'")), "NoneAttributeError");
  assert.equal(errorKind(crash("t", "AttributeError: 'str' object has no attribute 'foo'")), "AttributeError");
  assert.equal(errorKind(crash("t", "TypeError: 'NoneType' object is not subscriptable")), "NoneTypeError");
  assert.equal(errorKind(crash("t", "IndentationError: unexpected indent (reorder.py, line 3)")), "IndentationError");
  assert.equal(errorKind(crash("t", "ModuleNotFoundError: No module named 'x'")), "ImportError");
  assert.equal(errorKind(fail("t")), "AssertionFail");
  assert.equal(errorKind(pass("t")), null);
  assert.equal(errorKind({ status: "error", message: "" }), "OtherError");
});

test("boundary (off-by-one style) check names", () => {
  for (const n of ["test_exactly_25_dollars_is_free", "test_empty_cart_is_zero", "test_last_item_is_counted", "test_just_under_25_dollars_pays_the_fee", "test_no_orders_yet", "test_one_late_order"]) {
    assert.ok(isBoundaryCheck(n), n);
  }
  for (const n of ["test_greets_customer_by_name", "test_removed_item_is_skipped", "test_uses_todays_prices", "test_counts_each_dish"]) {
    assert.ok(!isBoundaryCheck(n), n);
  }
});

test("a run entry: counts, failing names, error kinds, no code, error line hash", () => {
  const result: RunLike = { passed: false, results: [pass("test_a"), crash("test_b", "KeyError: 'x'"), fail("test_c")] };
  const e = runEntry({ prev: undefined, result, files: CODE, totalChecks: 3, stepped: false, now: 1000 })!;
  assert.equal(e.passed, 1);
  assert.equal(e.total, 3);
  assert.deepEqual(e.failing, ["test_b", "test_c"]);
  assert.deepEqual(e.errors, ["KeyError", "AssertionFail"]);
  assert.equal(e.changed, true);
  assert.equal(e.hash, codeHash(CODE));
  assert.deepEqual(e.errLine, { file: "app/reorder.py", line: 3, hash: lineHash(CODE["app/reorder.py"], 3) });
  assert.equal(e.stepped, undefined);
  // Privacy: nothing of the source code is in the entry.
  assert.ok(!JSON.stringify(e).includes("menu[i]"));
  assert.ok(!JSON.stringify(e).includes("garlic"));
});

test("changed / stepped / edited-the-reported-line flags", () => {
  const result: RunLike = { passed: false, results: [crash("test_b", "KeyError: 'x'")] };
  const first = runEntry({ prev: undefined, result, files: CODE, totalChecks: 1, stepped: false, now: 1 })!;
  const same = runEntry({ prev: first, result, files: CODE, totalChecks: 1, stepped: true, now: 2 })!;
  assert.equal(same.changed, false);
  assert.equal(same.stepped, true);
  assert.equal(same.editedErrLine, false);
  // Edit another line only.
  const other = { "app/reorder.py": CODE["app/reorder.py"].replace("out = []", "out = list()") };
  const e2 = runEntry({ prev: first, result, files: other, totalChecks: 1, stepped: false, now: 3 })!;
  assert.equal(e2.changed, true);
  assert.equal(e2.editedErrLine, false);
  // Edit the reported line (3).
  const fixed = { "app/reorder.py": CODE["app/reorder.py"].replace("menu[i]", "menu.get(i)") };
  const e3 = runEntry({ prev: first, result: { passed: true, results: [pass("test_b")] }, files: fixed, totalChecks: 1, stepped: false, now: 4 })!;
  assert.equal(e3.editedErrLine, true);
  assert.ok(entryPassed(e3));
  assert.equal(e3.errLine, undefined);
});

test("timeouts are logged, other runner failures are not", () => {
  const t = runEntry({ prev: undefined, result: { passed: false, results: [], error: "Your code took longer than 8 seconds. Is there a loop that never ends?" }, files: CODE, totalChecks: 4, stepped: false, now: 1 })!;
  assert.deepEqual(t.errors, ["Timeout"]);
  assert.equal(t.passed, 0);
  assert.equal(t.total, 4);
  assert.equal(runEntry({ prev: undefined, result: { passed: false, results: [], error: "Python was restarted." }, files: CODE, totalChecks: 4, stepped: false, now: 1 }), null);
});

test("the log is capped at the newest 20 entries", () => {
  let log: RunLogEntry[] = [];
  for (let i = 0; i < 25; i++) log = appendRun(log, { at: i, passed: 0, total: 1, failing: ["t"], errors: ["AssertionFail"], changed: true, hash: "h" });
  assert.equal(log.length, RUN_LOG_CAP);
  assert.equal(log[0].at, 5);
  assert.equal(log.at(-1)!.at, 24);
});

test("old saves and junk still load: cleanRunLog keeps only well-formed entries", () => {
  assert.deepEqual(cleanRunLog(undefined), []);
  assert.deepEqual(cleanRunLog("nope"), []);
  const log = cleanRunLog([
    null,
    { at: "x" },
    { at: 1, passed: 1, total: 2, failing: ["a", 3], errors: "KeyError", hash: "ab", stepped: "yes", errLine: { file: "f", line: "2" } },
  ]);
  assert.equal(log.length, 1);
  assert.deepEqual(log[0], { at: 1, passed: 1, total: 2, failing: ["a"], errors: [], changed: true, hash: "ab" });
});
