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
