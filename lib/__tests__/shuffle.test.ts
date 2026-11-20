import assert from "node:assert/strict";
import { test } from "node:test";
import { shuffledOrder } from "../game/shuffle.ts";

test("shuffledOrder is a permutation and stable per seed", () => {
  const a = shuffledOrder(4, "s01-t01:q0");
  assert.deepEqual([...a].sort(), [0, 1, 2, 3]);
  assert.deepEqual(shuffledOrder(4, "s01-t01:q0"), a);
  assert.deepEqual(shuffledOrder(0, "x"), []);
  assert.deepEqual(shuffledOrder(1, "x"), [0]);
});

test("shuffledOrder spreads the first choice across positions", () => {
  const positions = new Set<number>();
  for (let i = 0; i < 40; i++) positions.add(shuffledOrder(4, `seed-${i}`).indexOf(0));
  assert.equal(positions.size, 4);
});
