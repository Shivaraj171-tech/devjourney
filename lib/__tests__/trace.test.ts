import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyTraceGrid,
  formatsXp,
  hasTaskFormats,
  recordAttempt,
  recordWatched,
  TRACE_RETRY_XP,
  TRACE_XP,
  traceFeedback,
  traceGridStarted,
  traceRequest,
  traceXp,
} from "../game/formats.ts";

const task = { code: "def f(n):\n    return n\n\nx = f(1)", watch: ["n", "x"], rows: 2, explain: "." };

test("a ticket with only a trace table has task formats", () => {
  assert.equal(hasTaskFormats({ formats: { predict: [], breakIt: [], parsons: [], trace: [task] } }), true);
  assert.equal(hasTaskFormats({ formats: { predict: [], breakIt: [], parsons: [], trace: [] } }), false);
  assert.equal(hasTaskFormats({ formats: { predict: [], breakIt: [], parsons: [] } }), false);
});

test("trace XP: +15 within 2 checks, +10 after (or after watching it run), never 0", () => {
  assert.equal(traceXp(1), TRACE_XP);
  assert.equal(traceXp(2), 15);
  assert.equal(traceXp(3), TRACE_RETRY_XP);
  assert.equal(traceXp(9), 10);
  assert.equal(traceXp(1, true), 10);
});

test("recording trace checks: misses cost nothing, the first success counts once", () => {
  const miss = recordAttempt("trace", undefined, false);
  assert.deepEqual(miss, { kind: "trace", attempts: 1, done: false, xp: 0 });
  const cells = [["1", ""], ["", "1"]];
  const hit = recordAttempt("trace", miss, true, { cells });
  assert.deepEqual(hit, { kind: "trace", attempts: 2, done: true, xp: 15, cells });
  assert.equal(recordAttempt("trace", hit, true), hit); // can't farm XP
  const late = recordAttempt("trace", recordAttempt("trace", miss, false), true, { cells });
  assert.equal(late.xp, 10);
  assert.equal(formatsXp({ "trace:0": hit, "trace:1": late }), 25);
});

test("watching it run first gives the smaller bonus", () => {
  const watched = recordWatched(undefined);
  assert.deepEqual(watched, { kind: "trace", attempts: 0, done: false, xp: 0, watched: true });
  assert.equal(recordWatched(watched), watched);
  const missThenWatch = recordWatched(recordAttempt("trace", undefined, false));
  assert.equal(missThenWatch.attempts, 1);
  const hit = recordAttempt("trace", missThenWatch, true, { cells: [] });
  assert.equal(hit.xp, TRACE_RETRY_XP);
  assert.equal(hit.watched, true);
  // Watching after it's done changes nothing.
  const done = recordAttempt("trace", undefined, true, { cells: [] });
  assert.equal(recordWatched(done), done);
});

test("trace requests and grids", () => {
  assert.deepEqual(traceRequest(task), { kind: "trace", code: task.code, watch: ["n", "x"] });
  assert.deepEqual(traceRequest(task, [["1", ""]]).answers, [["1", ""]]);
  const grid = emptyTraceGrid(3, 2);
  assert.deepEqual(grid, [["", ""], ["", ""], ["", ""]]);
  assert.equal(traceGridStarted(grid), false);
  grid[2][1] = " 4 ";
  assert.equal(traceGridStarted(grid), true);
});

test("trace feedback points at the first wrong step", () => {
  const base = { rows: [], stdout: "", truncated: false, error: null };
  assert.equal(traceFeedback({ ...base, all_right: true, first_wrong: null }).tone, "good");
  const wrong = traceFeedback({ ...base, all_right: false, first_wrong: 2 });
  assert.equal(wrong.tone, "neutral");
  assert.match(wrong.text, /Step 3/);
  assert.equal(traceFeedback({ ...base, error: "ZeroDivisionError" }).tone, "warn");
});
