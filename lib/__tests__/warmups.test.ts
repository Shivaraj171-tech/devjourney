import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  cardStates,
  conceptWeakness,
  daysBetween,
  mergeWarmupHistory,
  missSignals,
  nextReviewDay,
  planWarmups,
  reasonText,
  type TicketSignals,
  type WarmupAttempt,
} from "../game/warmups.ts";

const TODAY = "2026-11-20";
const W = [
  { id: "s1", concept: "strings", after: "t1" },
  { id: "s2", concept: "strings", after: "t1" },
  { id: "n1", concept: "numbers", after: "t2" },
  { id: "n2", concept: "numbers", after: "t2" },
  { id: "c1", concept: "conditionals", after: "t3" },
  { id: "l1", concept: "loops", after: "t4" },
  { id: "locked", concept: "classes", after: "t9" },
];
const SOLVED = new Set(["t1", "t2", "t3", "t4"]);
const plan = (history: WarmupAttempt[], extra: Partial<Parameters<typeof planWarmups>[0]> = {}) =>
  planWarmups({ warmups: W, solvedTicketIds: SOLVED, history, signals: [], today: TODAY, ...extra });
const ids = (s: ReturnType<typeof plan>) => s.items.map((i) => i.warmup.id);

test("dates: calendar arithmetic across months and years", () => {
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-11-17", TODAY), 3);
});

test("Leitner boxes: right moves up (1, 3, 7, 14 days), a miss goes back to box 1", () => {
  const h: WarmupAttempt[] = [
    { id: "a", day: "2026-11-01", correct: true },
    { id: "a", day: "2026-11-04", correct: true },
    { id: "a", day: "2026-11-11", correct: true },
    { id: "a", day: "2026-11-25", correct: true },
  ];
  assert.deepEqual(
    h.map((_, i) => cardStates(h.slice(0, i + 1)).get("a")!.due),
    ["2026-11-04", "2026-11-11", "2026-11-25", "2026-12-09"], // box 2, 3, 4, stays 4
  );
  const missed = cardStates([...h, { id: "a", day: "2026-12-09", correct: false }]).get("a")!;
  assert.equal(missed.box, 1);
  assert.equal(missed.due, "2026-12-10");
});

test("old saves: the one-per-day record merges into the log (no duplicates, oldest first)", () => {
  const merged = mergeWarmupHistory(
    [{ id: "n1", day: "2026-11-19", correct: true }],
    { "2026-11-18": { id: "s1", correct: false }, "2026-11-19": { id: "n1", correct: true } },
  );
  assert.deepEqual(merged, [
    { id: "s1", day: "2026-11-18", correct: false },
    { id: "n1", day: "2026-11-19", correct: true },
  ]);
  assert.deepEqual(mergeWarmupHistory(undefined, undefined), []);
});

test("a new learner gets up to 3 new warm-ups, one per concept, only unlocked ones", () => {
  const s = plan([]);
  assert.equal(s.items.length, 3);
  assert.equal(new Set(s.items.map((i) => i.warmup.concept)).size, 3);
  assert.ok(!ids(s).includes("locked"));
  assert.ok(s.items.every((i) => i.reason.kind === "new"));
  assert.deepEqual(ids(plan([])), ids(s)); // stable for the day
  assert.equal(plan([], { solvedTicketIds: new Set() }).items.length, 0);
  // Only one concept unlocked: two items on it (still "up to 3").
  assert.deepEqual(ids(plan([], { solvedTicketIds: new Set(["t1"]) })).sort(), ["s1", "s2"]);
});

test("due reviews come first, misses before ones you got right", () => {
  const s = plan([
    { id: "n1", day: "2026-11-13", correct: true }, // box 2, due 11-16
    { id: "s1", day: "2026-11-17", correct: false }, // box 1, due 11-18
    { id: "c1", day: "2026-11-19", correct: true }, // box 2, due 11-22: not due
  ]);
  assert.deepEqual(ids(s).slice(0, 2), ["s1", "n1"]);
  assert.deepEqual(s.items[0].reason, { kind: "review", lastCorrect: false, daysAgo: 3 });
  assert.equal(reasonText(s.items[0].reason, (c) => c), "Review: you missed this 3 days ago");
  assert.equal(reasonText(s.items[1].reason, (c) => c), "Review: you got this right 7 days ago, locking it in");
  assert.ok(!ids(s).includes("c1")); // not due, and there are new ones to do
});

test("interleaving: a second item on the same concept waits while other concepts are available", () => {
  const s = plan([
    { id: "s1", day: "2026-11-17", correct: false },
    { id: "s2", day: "2026-11-17", correct: false },
  ]);
  const concepts = s.items.map((i) => i.warmup.concept);
  assert.equal(new Set(concepts).size, 3);
  assert.equal(concepts[0], "strings");
});

test("weak concepts: quiz misses and waved-through Byte bugs pull in new warm-ups on that concept", () => {
  const tickets: Record<string, TicketSignals> = {
    t3: { runs: 3, solvedAt: "2026-11-18T10:00:00", quizDone: true, quizFirstPick: [1, 0, 2], quizFirstTryCorrect: 1 },
    t4: {
      runs: 4, solvedAt: "2026-11-19T10:00:00", quizDone: false, quizFirstPick: [], quizFirstTryCorrect: 0,
      byteSuggestion: { decision: "accept", correct: false, runsAtDecision: 1 },
    },
  };
  const signals = missSignals([], {}, tickets, { t3: "conditionals", t4: "loops" });
  assert.deepEqual(
    signals.map((x) => [x.concept, x.source, x.count]),
    [["conditionals", "quiz", 2], ["loops", "byte", 1]],
  );
  const s = plan([], { signals });
  assert.deepEqual(ids(s).slice(0, 2), ["c1", "l1"]); // 2 quiz misses outweigh 1 Byte miss
  assert.equal(reasonText(s.items[0].reason, (c) => c), "Practice: you missed a quiz question on conditionals 2 days ago");
  assert.equal(reasonText(s.items[1].reason, (c) => c), "Practice: a wrong Byte suggestion on loops got past you yesterday");

  // Rejecting a wrong suggestion (caught) or not running it yet is not a miss.
  const caught = missSignals([], {}, { t4: { ...tickets.t4, byteSuggestion: { decision: "reject", correct: false, runsAtDecision: 1 } } }, { t4: "loops" });
  assert.equal(caught.length, 0);
});

test("weakness fades: an old miss counts less than a recent one", () => {
  const w = conceptWeakness(
    [
      { concept: "old", source: "quiz", day: "2026-10-01", count: 1 },
      { concept: "new", source: "quiz", day: "2026-11-19", count: 1 },
    ],
    TODAY,
  );
  assert.ok(w.get("new")!.score > w.get("old")!.score);
});

test("answered today stays first and the rest doesn't reshuffle; done after 3", () => {
  const before = plan([]);
  const first = before.items[0].warmup.id;
  const after1 = plan([{ id: first, day: TODAY, correct: false }]);
  assert.deepEqual(ids(after1), ids(before));
  assert.deepEqual(after1.items[0].answer, { correct: false });
  assert.equal(after1.answered, 1);
  assert.equal(after1.done, false);

  const all = before.items.map((i, n) => ({ id: i.warmup.id, day: TODAY, correct: n !== 0 }));
  const done = plan(all);
  assert.equal(done.done, true);
  assert.equal(done.correctFirstTry, 2);
  // Tomorrow, the miss is the first review.
  const tomorrow = plan(all, { today: addDays(TODAY, 1) });
  assert.equal(tomorrow.items[0].warmup.id, first);
  assert.equal(reasonText(tomorrow.items[0].reason, (c) => c), "Review: you missed this yesterday");
  assert.equal(nextReviewDay(all, TODAY), addDays(TODAY, 1));
});

test("a legacy one-a-day save still plans: yesterday's miss is today's review", () => {
  const history = mergeWarmupHistory(undefined, { "2026-11-19": { id: "n2", correct: false } });
  const s = plan(history);
  assert.equal(s.items[0].warmup.id, "n2");
  assert.equal(s.items.length, 3);
});

test("everything seen and nothing due: early practice fills the session", () => {
  const history = W.filter((w) => w.id !== "locked").map((w) => ({ id: w.id, day: "2026-11-19", correct: true }));
  const s = plan(history);
  assert.equal(s.items.length, 3);
  assert.ok(s.items.every((i) => i.reason.kind === "extra"));
  assert.equal(reasonText(s.items[0].reason, (c) => c).startsWith("Extra practice: "), true);
});
