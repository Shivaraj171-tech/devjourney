import assert from "node:assert/strict";
import { test } from "node:test";
import { changedLines, removedLines } from "../review/diff.ts";

test("changedLines marks added and modified lines", () => {
  assert.deepEqual([...changedLines("a\nb\nc", "a\nB\nc\nd")], [2, 4]);
  assert.deepEqual([...changedLines(undefined, "x\ny")], [1, 2]);
});

test("removedLines groups deleted lines before the line that now follows them", () => {
  const r = removedLines("a\nfee = 399\nb\nc", "a\nb\nc");
  assert.deepEqual([...r.entries()], [[2, ["fee = 399"]]]);
  const end = removedLines("a\nb", "a");
  assert.deepEqual([...end.entries()], [[2, ["b"]]]);
  assert.equal(removedLines(undefined, "a").size, 0);
});

test("a modified line shows as removed old + added new", () => {
  const r = removedLines("if x >= 1:\n    y", "if x > 1:\n    y");
  assert.deepEqual([...r.entries()], [[1, ["if x >= 1:"]]]);
});
