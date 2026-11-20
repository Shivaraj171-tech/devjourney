import assert from "node:assert/strict";
import { test } from "node:test";
import { newlyEarned, parseSeenBadges } from "../game/newBadges.ts";

test("newlyEarned: first visit shows nothing, later shows only new ones", () => {
  assert.deepEqual(newlyEarned(null, ["first-commit"]), []);
  assert.deepEqual(newlyEarned(["first-commit"], ["first-commit", "no-hints"]), ["no-hints"]);
  assert.deepEqual(newlyEarned(["a", "b"], ["a"]), []);
});

test("parseSeenBadges handles junk", () => {
  assert.equal(parseSeenBadges(null), null);
  assert.equal(parseSeenBadges("not json"), null);
  assert.equal(parseSeenBadges('{"a":1}'), null);
  assert.deepEqual(parseSeenBadges('["a", 2, "b"]'), ["a", "b"]);
});
