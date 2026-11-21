import assert from "node:assert/strict";
import { test } from "node:test";
import { adaptiveHelp, stuckCheck } from "../game/help.ts";
import type { RunLogEntry } from "../game/runLog.ts";

let clock = 0;
const run = (extra: Partial<RunLogEntry>): RunLogEntry => ({
  at: ++clock,
  passed: 1,
  total: 3,
  failing: ["test_removed_item_is_skipped"],
  errors: ["KeyError"],
  changed: true,
  hash: `h${clock}`,
  ...extra,
});
const TICKET = { hasLesson: true, hasTrace: false, hintsLeft: 3 };

test("no help before 3 failed runs on the same check", () => {
  assert.equal(adaptiveHelp([run({}), run({})], TICKET), null);
  // Three failures, but on different checks.
  assert.equal(adaptiveHelp([run({ failing: ["a"] }), run({ failing: ["b"] }), run({ failing: ["c"] })], TICKET), null);
  // A pass in the last three.
  assert.equal(adaptiveHelp([run({}), run({ passed: 3, failing: [], errors: [] }), run({})], TICKET), null);
  assert.deepEqual(stuckCheck([run({}), run({}), run({})])?.check, "test_removed_item_is_skipped");
});

test("KeyError -> step through to see what the dictionary holds", () => {
  const h = adaptiveHelp([run({}), run({}), run({})], TICKET)!;
  assert.equal(h.id, "keyerror");
  assert.equal(h.action, "step-through");
  assert.equal(h.check, "test_removed_item_is_skipped");
  assert.match(h.title, /Step through to see what the dictionary holds/);
  assert.match(h.because, /3 runs in a row/);
});

test("the same code run again and again -> change one thing, then run", () => {
  const h = adaptiveHelp([run({}), run({ changed: false }), run({ changed: false })], TICKET)!;
  assert.equal(h.id, "change-one-thing");
});

test("boundary failures -> trace table when the ticket has one, else the lesson", () => {
  const b = (extra: Partial<RunLogEntry> = {}) => run({ failing: ["test_exactly_25_dollars_is_free"], errors: ["AssertionFail"], ...extra });
  assert.equal(adaptiveHelp([b(), b(), b()], { ...TICKET, hasTrace: true })!.action, "trace");
  const lesson = adaptiveHelp([b(), b(), b()], TICKET)!;
  assert.equal(lesson.id, "boundary");
  assert.equal(lesson.action, "lesson");
});

test("None, syntax, timeouts", () => {
  const none = adaptiveHelp([run({ errors: ["NoneAttributeError"] }), run({ errors: ["NoneAttributeError"] }), run({ errors: ["NoneAttributeError"] })], TICKET)!;
  assert.equal(none.id, "none");
  const syn = (extra: Partial<RunLogEntry> = {}) => run({ failing: ["(import)"], errors: ["SyntaxError"], passed: 0, ...extra });
  assert.equal(adaptiveHelp([syn(), syn(), syn()], TICKET)!.id, "syntax");
  const t = (extra: Partial<RunLogEntry> = {}) => run({ failing: [], errors: ["Timeout"], passed: 0, ...extra });
  assert.equal(adaptiveHelp([t(), t(), t()], { ...TICKET, hasTrace: true })!.action, "trace");
});

test("a wrong answer: step through first; a hint for learners who already step through", () => {
  const w = (extra: Partial<RunLogEntry> = {}) => run({ errors: ["AssertionFail"], failing: ["test_counts_each_dish"], ...extra });
  assert.equal(adaptiveHelp([w(), w(), w()], TICKET)!.action, "step-through");
  assert.equal(adaptiveHelp([w(), w({ stepped: true }), w()], TICKET)!.action, "hint");
  // Leans on hints: Step through, even if they use the debugger.
  assert.equal(adaptiveHelp([w(), w(), w()], TICKET, ["uses-debugger", "leans-on-hints"])!.action, "step-through");
  // No hints left: Step through.
  assert.equal(adaptiveHelp([w(), w({ stepped: true }), w()], { ...TICKET, hintsLeft: 0 })!.action, "step-through");
});

test("habits tune the wording: learners who skip the 📍 line get pointed at it", () => {
  const h = adaptiveHelp([run({}), run({}), run({})], TICKET, ["skims-errors"])!;
  assert.match(h.body, /📍/);
});
