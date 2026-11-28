import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkLabel,
  describeChanges,
  diffLocals,
  previousInFrame,
  resultCaption,
  splitException,
  stepCaption,
  timelineLength,
} from "../debugger/timeline.ts";
import type { TraceStep } from "../runner/types.ts";

function step(event: TraceStep["event"], line: number, locals: [string, string][], extra: Partial<TraceStep> = {}): TraceStep {
  return { file: "app/cart.py", line, func: "cart_subtotal", frame: 1, event, locals, stdout: "", stack: ["test_a", "cart_subtotal"], ...extra };
}

// The buggy cart_subtotal([450, 299]) from Season 1, ticket 4.
const P: [string, string] = ["prices", "[450, 299]"];
const cart: TraceStep[] = [
  step("call", 8, [P]),
  step("line", 10, [P]),
  step("line", 11, [P, ["total", "0"]]),
  step("line", 12, [P, ["total", "0"], ["i", "0"]]),
  step("line", 11, [P, ["total", "450"], ["i", "0"]]),
  step("line", 13, [P, ["total", "450"], ["i", "0"]]),
  step("return", 13, [P, ["total", "450"], ["i", "0"]], { value: "450" }),
];

test("diffLocals marks new and changed variables against the same call", () => {
  assert.deepEqual([...diffLocals(cart, 0)], [["prices", "new"]]);
  assert.deepEqual([...diffLocals(cart, 1)], []);
  assert.deepEqual([...diffLocals(cart, 2)], [["total", "new"]]);
  assert.deepEqual([...diffLocals(cart, 4)], [["total", "changed"]]);
  assert.deepEqual([...diffLocals(cart, 99)], []);
});

test("diffLocals ignores steps from other function calls", () => {
  const steps = [
    step("line", 3, [["x", "1"]], { frame: 1, func: "outer" }),
    step("call", 9, [["x", "5"]], { frame: 2, func: "inner" }),
    step("return", 9, [["x", "5"]], { frame: 2, func: "inner", value: "5" }),
    step("line", 4, [["x", "1"], ["y", "5"]], { frame: 1, func: "outer" }),
  ];
  assert.equal(previousInFrame(steps, 3), 0);
  assert.deepEqual([...diffLocals(steps, 3)], [["y", "new"]]);
  assert.deepEqual([...diffLocals(steps, 1)], [["x", "new"]]);
});

test("captions for calls, lines, loops and returns", () => {
  assert.equal(stepCaption(cart, 0), "cart_subtotal is called with prices = [450, 299]");
  assert.equal(stepCaption(cart, 1), "Line 10: cart_subtotal starts here");
  assert.equal(stepCaption(cart, 2), "Line 11 runs next, and total is set to 0");
  assert.equal(stepCaption(cart, 3), "Line 12 runs next, and i is set to 0");
  assert.equal(stepCaption(cart, 4), "Line 11: back to the top of the loop, and total is now 450");
  assert.equal(stepCaption(cart, 5), "Line 13 runs next");
  assert.equal(stepCaption(cart, 6), "cart_subtotal returns 450");
  assert.equal(stepCaption(cart, 7), "");
  assert.equal(stepCaption([step("call", 1, [], { func: "forever" })], 0), "forever is called");
});

test("captions for exceptions", () => {
  const steps = [
    step("call", 8, [["d", "{}"]], { func: "lookup", frame: 2 }),
    step("line", 9, [["d", "{}"]], { func: "lookup", frame: 2 }),
    step("exception", 9, [["d", "{}"]], { func: "lookup", frame: 2, exception: "KeyError: 'pizza'", raised_here: true }),
    step("unwind", 9, [["d", "{}"]], { func: "lookup", frame: 2 }),
    step("exception", 14, [], { func: "safe_lookup", frame: 1, exception: "KeyError: 'pizza'", raised_here: false }),
    step("line", 15, [], { func: "safe_lookup", frame: 1 }),
  ];
  assert.equal(stepCaption(steps, 2), "KeyError raised here: 'pizza'");
  assert.equal(stepCaption(steps, 3), "lookup stops early because of the KeyError");
  assert.equal(stepCaption(steps, 4), "The KeyError reaches safe_lookup (line 14)");
  assert.equal(stepCaption(steps, 5), "Line 15: the KeyError is caught");
  assert.deepEqual(splitException("StopIteration"), { name: "StopIteration", detail: "" });
});

test("describeChanges keeps captions short", () => {
  const s = step("line", 5, [["a", "1"], ["b", "2"], ["c", "3"], ["d", "4"], ["e", "5"]]);
  const all = new Map([..."abcde"].map((n) => [n, "changed" as const]));
  assert.equal(describeChanges(s, all), "a is now 1, b is now 2, c is now 3 and 2 more");
});

test("result captions and timeline length", () => {
  assert.match(resultCaption({ status: "pass", steps: cart, truncated: false }), /passed/);
  assert.match(resultCaption({ status: "fail", steps: cart, truncated: false }), /wasn't what it expected/);
  assert.match(resultCaption({ status: "error", steps: cart, truncated: false }), /crashed/);
  assert.equal(
    resultCaption({ status: "stopped", steps: Array(300).fill(cart[1]), truncated: true }),
    "Stopped after 300 steps. Is there a loop that never ends?",
  );
  assert.equal(timelineLength({ steps: cart }), 8);
  assert.equal(checkLabel("test_last_item_is_counted"), "last item is counted");
});
