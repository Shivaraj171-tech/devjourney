import assert from "node:assert/strict";
import { test } from "node:test";
import { runEncouragement } from "../game/feedback.ts";

test("runEncouragement: nothing when all pass", () => {
  assert.equal(runEncouragement(3, 3), "");
  assert.equal(runEncouragement(0, 0), "");
});

test("runEncouragement: one left, none passing, several left", () => {
  assert.match(runEncouragement(3, 4), /one check to go/);
  assert.match(runEncouragement(0, 4), /Start with the first one/);
  assert.match(runEncouragement(1, 4), /3 checks to go/);
});

test("runEncouragement: compares with the previous run", () => {
  assert.match(runEncouragement(3, 4, 1), /2 more passing/);
  assert.match(runEncouragement(1, 4, 3), /broke something/);
  assert.doesNotMatch(runEncouragement(2, 4, 2), /Progress|Careful/);
});

test("runEncouragement: zero passing is never 'so close', even with one check left", () => {
  assert.doesNotMatch(runEncouragement(0, 1), /So close/);
  assert.match(runEncouragement(0, 1), /No checks pass yet/);
  assert.match(runEncouragement(0, 2), /No checks pass yet/);
  assert.match(runEncouragement(1, 2), /So close: one check to go/);
});

test("runEncouragement: code that fails to load says so, whatever the counts", () => {
  // Audit: an IndentationError collapsed 2 checks into 1 synthetic failure and read "So close".
  const msg = runEncouragement(0, 2, undefined, true);
  assert.match(msg, /didn't load/);
  assert.doesNotMatch(msg, /So close|one check to go/);
  assert.match(runEncouragement(0, 1, 1, true), /didn't load/);
});
