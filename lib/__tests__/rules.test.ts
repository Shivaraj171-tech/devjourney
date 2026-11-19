import assert from "node:assert/strict";
import { test } from "node:test";
import { currentStreak, dayKey, leaderboard, pickWarmup, quizXp, rankFor, readTicketXp, solveXp } from "../game/rules.ts";

function daysAgo(today: Date, ...offsets: number[]) {
  return offsets.map((o) => {
    const d = new Date(today);
    d.setDate(d.getDate() - o);
    return dayKey(d);
  });
}

const TODAY = new Date(2026, 10, 19, 12);

test("solveXp: base, hint penalty capped at 60%, first-run bonus", () => {
  assert.deepEqual(solveXp("intern", 0, 1), { base: 100, hintPenalty: 0, firstRunBonus: 25, total: 125 });
  assert.equal(solveXp("intern", 1, 2).total, 80);
  assert.equal(solveXp("intern", 10, 3).total, 40); // penalty capped at 60
  assert.equal(solveXp("junior", 0, 2).total, 150);
});

test("quiz and read-ticket XP", () => {
  assert.equal(quizXp(2), 30);
  assert.equal(readTicketXp("junior", 4, 4, 0), 150);
  assert.equal(readTicketXp("junior", 2, 4, 0), 75);
  assert.equal(readTicketXp("junior", 0, 0, 0), 0);
});

test("rankFor thresholds and progress", () => {
  assert.equal(rankFor(0).rank.id, "intern");
  assert.equal(rankFor(599).rank.id, "intern");
  assert.equal(rankFor(600).rank.id, "junior");
  assert.equal(rankFor(300).progress, 0.5);
  assert.equal(rankFor(99999).next, null);
});

test("streak: consecutive days, today not yet played keeps yesterday's streak", () => {
  assert.equal(currentStreak([], TODAY), 0);
  assert.equal(currentStreak(daysAgo(TODAY, 0, 1, 2), TODAY), 3);
  assert.equal(currentStreak(daysAgo(TODAY, 1, 2), TODAY), 2);
});

test("streak: one missed day is bridged by a day off, two are not", () => {
  assert.equal(currentStreak(daysAgo(TODAY, 0, 2, 3), TODAY), 3); // missed day 1
  assert.equal(currentStreak(daysAgo(TODAY, 0, 3, 4), TODAY), 1); // missed days 1 and 2
});

test("streak: only one freeze at the start, a second gap resets the count", () => {
  // active 0, gap 1, active 2, gap 3, active 4: first gap (oldest) uses the freeze,
  // the second has none left, so only days after it count.
  assert.equal(currentStreak(daysAgo(TODAY, 0, 2, 4), TODAY), 1);
});

test("streak: 7 days earns another freeze", () => {
  // 7 days in a row (days 3..9), gap at 2, active 1, gap... no: active 0,1 then gap 2 then 3..9
  const days = daysAgo(TODAY, 0, 1, 3, 4, 5, 6, 7, 8, 9, 11);
  // oldest: 11 active, gap 10 (freeze used), 9..3 active (7 more days -> earn freeze at 7th streak day), gap 2 (freeze), 1, 0
  assert.equal(currentStreak(days, TODAY), 10);
});

test("leaderboard includes you, sorted by XP", () => {
  const board = leaderboard({ name: "Ana", xp: 500 }, 0);
  assert.ok(board.some((b) => b.isYou && b.name === "Ana"));
  for (let i = 1; i < board.length; i++) assert.ok(board[i - 1].xp >= board[i].xp);
});

test("pickWarmup: only unlocked concepts, prefers unseen, stable per day", () => {
  const w = [
    { id: "w1", after: "s01-t01" },
    { id: "w2", after: "s01-t01" },
    { id: "w3", after: "s01-t05" },
  ];
  assert.equal(pickWarmup(w, new Set(), new Set(), "2026-11-19"), null);
  const solved = new Set(["s01-t01"]);
  const pick = pickWarmup(w, solved, new Set(), "2026-11-19")!;
  assert.ok(["w1", "w2"].includes(pick.id));
  assert.equal(pickWarmup(w, solved, new Set(), "2026-11-19")!.id, pick.id); // stable
  const other = pick.id === "w1" ? "w2" : "w1";
  assert.equal(pickWarmup(w, solved, new Set([pick.id]), "2026-11-19")!.id, other); // unseen first
  assert.ok(pickWarmup(w, solved, new Set(["w1", "w2"]), "2026-11-19")); // falls back to repeats
});
