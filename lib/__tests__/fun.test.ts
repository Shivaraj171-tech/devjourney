import assert from "node:assert/strict";
import { test } from "node:test";
import { RANKS } from "../game/rules.ts";
import {
  cleanSolve,
  countUpValue,
  easeOut,
  flowLabel,
  flowStreak,
  performanceReview,
  promotion,
  rankProgress,
  typeCount,
  type FlowTicket,
  type ReviewTicket,
  type ReviewTicketProgress,
} from "../game/juice.ts";
import { parseSnapshot, roomChanges } from "../game/rooms.ts";
import { teamChat, type ChatInput, type ChatTicket } from "../game/teamChat.ts";
import type { HitlScore } from "../game/byte.ts";

const NO_HITL: HitlScore = { caught: 0, wavedThrough: 0, trusted: 0, doubted: 0, pending: 0, bestPrompts: 0, promptsTried: 0, practice: 0 };

function solvedAt(minute: number, extra: Partial<FlowTicket> = {}): FlowTicket {
  return {
    solved: true,
    solvedAt: new Date(Date.UTC(2026, 10, 19, 12, minute)).toISOString(),
    runs: 1,
    hintsUsed: 0,
    quizFirstPick: [],
    quizFirstTryCorrect: 0,
    ...extra,
  };
}

// ---------- juice ----------

test("promotion: only when a rank threshold is crossed, upwards", () => {
  assert.equal(promotion(600, 690, RANKS), null);
  assert.equal(promotion(650, 725, RANKS)?.id, "trusted-intern");
  assert.equal(promotion(700, 800, RANKS), null); // already Trusted Intern
  assert.equal(promotion(800, 700, RANKS), null); // never "demoted"
  assert.equal(promotion(0, 3000, RANKS)?.id, "junior"); // skips to the highest reached
});

test("rankProgress: fraction to the next rank and XP still needed", () => {
  assert.deepEqual(rankProgress(350, RANKS), { progress: 0.5, toNext: 350, next: RANKS[1] });
  const top = rankProgress(20000, RANKS);
  assert.equal(top.progress, 1);
  assert.equal(top.toNext, null);
});

test("countUpValue eases from start to end and lands exactly", () => {
  assert.equal(countUpValue(100, 200, 0, 1000), 100);
  assert.equal(countUpValue(100, 200, 1000, 1000), 200);
  assert.equal(countUpValue(100, 200, 5000, 1000), 200);
  assert.equal(countUpValue(100, 200, 10, 0), 200); // reduced motion: no animation
  const mid = countUpValue(100, 200, 500, 1000);
  assert.ok(mid > 150 && mid < 200, `ease-out is past halfway at half time (${mid})`);
  assert.equal(easeOut(-1), 0);
  assert.equal(easeOut(2), 1);
});

test("cleanSolve: first run and no hints; reviews without false alarms; perfect read quizzes", () => {
  assert.equal(cleanSolve(solvedAt(0)), true);
  assert.equal(cleanSolve(solvedAt(0, { runs: 2 })), false);
  assert.equal(cleanSolve(solvedAt(0, { hintsUsed: 1 })), false);
  assert.equal(cleanSolve(solvedAt(0, { solved: false })), false);
  assert.equal(cleanSolve(solvedAt(0, { runs: 0, reviewSubmitted: ["a:1"], reviewFalseAlarms: [] })), true);
  assert.equal(cleanSolve(solvedAt(0, { runs: 0, reviewSubmitted: ["a:1"], reviewFalseAlarms: ["a:2"] })), false);
  assert.equal(cleanSolve(solvedAt(0, { runs: 0, quizFirstPick: [1, 0, 2], quizFirstTryCorrect: 3 })), true);
  assert.equal(cleanSolve(solvedAt(0, { runs: 0, quizFirstPick: [1, 0, 2], quizFirstTryCorrect: 2 })), false);
});

test("flowStreak counts the most recent clean merges in a row, by solve time", () => {
  assert.equal(flowStreak([]), 0);
  const tickets = [solvedAt(1), solvedAt(2, { runs: 3 }), solvedAt(3), solvedAt(4), solvedAt(5)];
  assert.equal(flowStreak(tickets), 3);
  // Order in the object doesn't matter, only solve time.
  assert.equal(flowStreak([...tickets].reverse()), 3);
  // Unsolved tickets are ignored.
  assert.equal(flowStreak([...tickets, { ...solvedAt(9), solved: false, runs: 4 }]), 3);
  assert.equal(flowStreak([...tickets, solvedAt(6, { hintsUsed: 1 })]), 0);
});

test("flowLabel appears from 2 and escalates", () => {
  assert.equal(flowLabel(1), null);
  assert.match(flowLabel(2)!, /Flow ×2/);
  assert.match(flowLabel(3)!, /On a roll ×3/);
  assert.match(flowLabel(6)!, /Deep flow ×6/);
});

// ---------- performance review ----------

const SEASON: ReviewTicket[] = [
  { id: "a", number: 1, title: "A", type: "bug", newConcept: "strings", questionCount: 2 },
  { id: "b", number: 2, title: "B", type: "feature", newConcept: "lists", questionCount: 2 },
  { id: "c", number: 3, title: "C", type: "review", newConcept: "code-review", questionCount: 0 },
  { id: "d", number: 4, title: "D", type: "bug", newConcept: "loops", questionCount: 1 },
];

function rp(extra: Partial<ReviewTicketProgress> = {}): ReviewTicketProgress {
  return { ...solvedAt(0), quizDone: true, quizFirstPick: [0, 0], quizFirstTryCorrect: 2, solveXp: 100, quizXp: 30, ...extra };
}

test("performanceReview: counts, learned concepts, rating and strengths", () => {
  const r = performanceReview(
    SEASON,
    {
      a: rp(),
      b: rp({ runs: 2, hintsUsed: 1, quizFirstTryCorrect: 1 }),
      c: rp({ runs: 0, reviewSubmitted: ["x:1"], reviewFalseAlarms: [], quizDone: false, quizFirstPick: [], quizFirstTryCorrect: 0, quizXp: 0 }),
      d: rp({ quizFirstPick: [0], quizFirstTryCorrect: 1 }),
    },
    { ...NO_HITL, caught: 2, wavedThrough: 0 },
  );
  assert.equal(r.complete, true);
  assert.equal(r.merged, 4);
  assert.equal(r.clean, 3);
  assert.equal(r.hintsUsed, 1);
  assert.equal(r.quizzes, 3);
  assert.equal(r.quizzesPerfect, 2);
  assert.equal(r.xp, 4 * 100 + 3 * 30);
  assert.deepEqual(r.learned, ["strings", "lists", "code-review", "loops"]);
  assert.deepEqual(r.byType, { bug: 2, feature: 1, review: 1 });
  assert.equal(r.rating.title, "Outstanding");
  assert.ok(r.strengths.some((s) => s.includes("Caught 2 of Byte's bugs")));
  assert.ok(r.strengths.some((s) => s.includes("zero false alarms")));
  assert.ok(r.strengths.some((s) => s.includes("Asked for help")));
  assert.match(r.nextStep!, /Done-when/);
});

test("performanceReview is never harsh, and handles an unfinished season", () => {
  const messy = performanceReview(SEASON, { a: rp({ runs: 5, hintsUsed: 3 }) }, { ...NO_HITL, wavedThrough: 1 });
  assert.equal(messy.complete, false);
  assert.equal(messy.merged, 1);
  assert.equal(messy.rating.title, "Solid progress");
  assert.match(messy.nextStep!, /run the tests before you trust/);
  const none = performanceReview(SEASON, {}, NO_HITL);
  assert.equal(none.merged, 0);
  assert.deepEqual(none.strengths, []);
  assert.equal(none.nextStep, null);
});

test("typeCount pluralises", () => {
  assert.equal(typeCount("bug", 1), "1 bug fixed");
  assert.equal(typeCount("review", 2), "2 pull requests reviewed");
});

// ---------- rooms ----------

test("roomChanges: only rooms that changed since the last visit; nothing on a first visit", () => {
  const now = { solved: ["a", "b", "c"], open: ["d"] };
  assert.deepEqual(roomChanges(null, now), {});
  assert.deepEqual(roomChanges({ solved: ["a"], open: ["b"] }, now), { b: "merged", c: "merged", d: "unlocked" });
  assert.deepEqual(roomChanges(now, now), {});
  // A room that was open before isn't "unlocked" again.
  assert.deepEqual(roomChanges({ solved: ["a", "b", "c"], open: ["d"] }, { solved: ["a", "b", "c"], open: ["d"] }), {});
});

test("parseSnapshot rejects junk", () => {
  assert.equal(parseSnapshot(null), null);
  assert.equal(parseSnapshot("{oops"), null);
  assert.equal(parseSnapshot('{"solved": 3}'), null);
  assert.deepEqual(parseSnapshot('{"solved": ["a", 1], "open": []}'), { solved: ["a"], open: [] });
});

// ---------- team chat ----------

const T = (n: number, type: ChatTicket["type"], seasonId = "s01"): ChatTicket => ({
  id: `${seasonId}-t${n}`,
  number: n,
  title: `Ticket ${n}`,
  type,
  seasonId,
  seasonTitle: seasonId === "s01" ? "Your First Week" : "Week Two",
});

function chat(extra: Partial<ChatInput>): ReturnType<typeof teamChat> {
  return teamChat({ playerName: "Alex", solved: [], seasonFinished: false, streak: 0, flow: 0, xp: 0, samXp: 150, ...extra });
}

test("teamChat: a fresh start introduces the team and points at ticket 1", () => {
  const msgs = chat({ next: T(1, "bug") });
  assert.deepEqual(msgs.map((m) => m.from), ["maya", "byte", "sam", "maya"]);
  assert.match(msgs[0].text, /Alex/);
  assert.equal(msgs.at(-1)!.link?.href, "/ticket/s01-t1");
});

test("teamChat: reacts to the last thing you shipped, by ticket type", () => {
  assert.equal(chat({ solved: [T(1, "bug")] })[0].from, "leo");
  assert.equal(chat({ solved: [T(1, "feature")] })[0].from, "priya");
  assert.equal(chat({ solved: [T(1, "review")] })[0].from, "maya");
  assert.match(chat({ solved: [T(1, "incident")] })[0].text, /Production's back/);
  assert.match(chat({ solved: [T(1, "bug"), T(2, "read")] })[0].text, /Ticket 2/);
});

test("teamChat: Byte reacts to how you handled its suggestion", () => {
  const caught = chat({ solved: [T(1, "bug")], last: { hintsUsed: 0, clean: false, byteOutcome: "caught" } });
  assert.ok(caught.some((m) => m.from === "byte" && /You were right/.test(m.text)));
  const waved = chat({ solved: [T(1, "bug")], last: { hintsUsed: 0, clean: false, byteOutcome: "waved-through" } });
  assert.ok(waved.some((m) => m.from === "byte" && /run the tests/.test(m.text)));
  const pending = chat({ solved: [T(1, "bug")], last: { hintsUsed: 0, clean: false, byteOutcome: "pending" } });
  assert.ok(!pending.some((m) => m.from === "byte"));
});

test("teamChat: flow, hints, rival, streak, season end and empty backlog", () => {
  const solved = [T(1, "bug")];
  assert.ok(chat({ solved, flow: 3 }).some((m) => m.id === "flow"));
  assert.ok(chat({ solved, last: { hintsUsed: 0, clean: true } }).some((m) => m.id.startsWith("clean-")));
  assert.ok(chat({ solved, last: { hintsUsed: 2, clean: false } }).some((m) => m.id.startsWith("hints-")));
  assert.ok(chat({ solved, xp: 500, samXp: 200 }).some((m) => m.id === "rival-ahead"));
  assert.match(chat({ solved, xp: 100, samXp: 250 }).find((m) => m.id === "rival-behind")!.text, /150 XP ahead/);
  assert.ok(chat({ solved, streak: 4 }).some((m) => m.id === "streak-4"));
  assert.ok(!chat({ solved, streak: 1 }).some((m) => m.id.startsWith("streak")));
  const end = chat({ solved, seasonFinished: true, next: T(1, "review", "s02") });
  assert.equal(end.find((m) => m.id === "season-s01")?.link?.href, "/review/s01");
  assert.equal(end.at(-1)!.link?.href, "/ticket/s02-t1");
  assert.equal(chat({ solved }).at(-1)!.id, "all-done");
});

test("teamChat is deterministic", () => {
  const input = { solved: [T(1, "bug"), T(2, "feature")], next: T(3, "bug"), streak: 2 };
  assert.deepEqual(chat(input), chat(input));
});
