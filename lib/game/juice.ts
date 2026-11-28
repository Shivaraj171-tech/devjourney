// "Juice" for the merge moment (XP count-up, promotions, the flow combo) and the
// end-of-season performance review. Pure functions only (type imports only), so
// node can unit-test them.
import type { TicketType } from "../content/types";
import type { HitlScore } from "./byte";

/** A rank as rules.ts RANKS defines it (only the fields used here). */
export type RankLike = { id: string; title: string; icon: string; minXp: number };

/** Index of the rank for an XP total (ranks sorted by minXp, first at 0). */
function rankIndex(xp: number, ranks: readonly RankLike[]): number {
  let i = 0;
  while (i + 1 < ranks.length && xp >= ranks[i + 1].minXp) i++;
  return i;
}

/**
 * The highest rank reached by going from `before` to `after` XP, or null if the
 * rank didn't change (or XP went down). Skipping a rank returns the top one reached.
 */
export function promotion<R extends RankLike>(before: number, after: number, ranks: readonly R[]): R | null {
  if (after <= before) return null;
  const from = rankIndex(before, ranks);
  const to = rankIndex(after, ranks);
  return to > from ? ranks[to] : null;
}

/** Progress (0-1) towards the next rank, and XP still needed (null at the top rank). */
export function rankProgress(xp: number, ranks: readonly RankLike[]): { progress: number; toNext: number | null; next: RankLike | null } {
  const i = rankIndex(xp, ranks);
  const next = ranks[i + 1] ?? null;
  if (!next) return { progress: 1, toNext: null, next: null };
  const span = next.minXp - ranks[i].minXp;
  return { progress: Math.min(1, Math.max(0, (xp - ranks[i].minXp) / span)), toNext: next.minXp - xp, next };
}

/** Ease-out cubic: fast at first, gentle landing. t in 0..1. */
export function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** The number to show `elapsedMs` into a count-up from `from` to `to` lasting `durationMs`. */
export function countUpValue(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return to;
  return Math.round(from + (to - from) * easeOut(elapsedMs / durationMs));
}

// ---------- Flow combo ----------

/** The minimum of a ticket's progress the flow combo needs (a subset of TicketProgress). */
export type FlowTicket = {
  solved: boolean;
  solvedAt?: string;
  runs: number;
  hintsUsed: number;
  quizFirstPick: (number | null)[];
  quizFirstTryCorrect: number;
  reviewSubmitted?: string[];
  reviewFalseAlarms?: string[];
};

/**
 * A "clean" merge: no hints, and right first time. Code tickets pass on the first
 * run; reviews have no false alarms; read tickets get every question right first try.
 */
export function cleanSolve(t: FlowTicket): boolean {
  if (!t.solved || t.hintsUsed > 0) return false;
  if (t.runs > 0) return t.runs === 1;
  if (t.reviewSubmitted) return (t.reviewFalseAlarms?.length ?? 0) === 0;
  const questions = t.quizFirstPick.length;
  return questions > 0 && t.quizFirstTryCorrect === questions;
}

/**
 * Flow: how many of the most recent merges (by solve time) in a row were clean.
 * Never punishing: a messy merge just starts a new run, nothing is taken away.
 */
export function flowStreak(tickets: FlowTicket[]): number {
  const solved = tickets.filter((t) => t.solved && t.solvedAt).sort((a, b) => Date.parse(b.solvedAt!) - Date.parse(a.solvedAt!));
  let n = 0;
  for (const t of solved) {
    if (!cleanSolve(t)) break;
    n++;
  }
  return n;
}

/** Flow labels: shown from 2 clean merges in a row. */
export function flowLabel(streak: number): string | null {
  if (streak < 2) return null;
  if (streak >= 5) return `Deep flow ×${streak}`;
  if (streak >= 3) return `On a roll ×${streak}`;
  return `Flow ×${streak}`;
}

// ---------- Season performance review ----------
// Maya's write-up of a season, built only from saved progress. Always encouraging:
// it names strengths and one thing to try next, never a failing grade.

export type ReviewTicket = { id: string; number: number; title: string; type: TicketType; newConcept: string; questionCount: number };

export type ReviewTicketProgress = FlowTicket & { quizDone: boolean; solveXp: number; quizXp: number };

export type PerformanceReview = {
  merged: number;
  total: number;
  complete: boolean;
  /** No hints and right first time (see juice.ts cleanSolve). */
  clean: number;
  noHints: number;
  hintsUsed: number;
  quizzes: number;
  quizzesPerfect: number;
  falseAlarms: number;
  xp: number;
  /** New concepts of merged tickets, in ticket order. */
  learned: string[];
  /** Merged tickets by type, e.g. { bug: 5, review: 1 }. */
  byType: Partial<Record<TicketType, number>>;
  rating: { title: string };
  strengths: string[];
  /** One friendly suggestion for next season (null if there's nothing to suggest). */
  nextStep: string | null;
};

const TYPE_WORD: Record<TicketType, [string, string]> = {
  bug: ["bug fixed", "bugs fixed"],
  feature: ["feature shipped", "features shipped"],
  read: ["codebase explored", "codebases explored"],
  review: ["pull request reviewed", "pull requests reviewed"],
  incident: ["incident resolved", "incidents resolved"],
};

export function typeCount(type: TicketType, n: number): string {
  return `${n} ${TYPE_WORD[type][n === 1 ? 0 : 1]}`;
}

export function performanceReview(tickets: ReviewTicket[], progress: Record<string, ReviewTicketProgress | undefined>, hitl: HitlScore): PerformanceReview {
  const done = tickets.filter((t) => progress[t.id]?.solved);
  const tp = (t: ReviewTicket) => progress[t.id]!;
  const clean = done.filter((t) => cleanSolve(tp(t))).length;
  const noHints = done.filter((t) => tp(t).hintsUsed === 0).length;
  const hintsUsed = done.reduce((s, t) => s + tp(t).hintsUsed, 0);
  const withQuiz = done.filter((t) => t.questionCount > 0 && tp(t).quizDone);
  const quizzesPerfect = withQuiz.filter((t) => tp(t).quizFirstTryCorrect === t.questionCount).length;
  const falseAlarms = done.reduce((s, t) => s + (tp(t).reviewFalseAlarms?.length ?? 0), 0);
  const xp = done.reduce((s, t) => s + tp(t).solveXp + tp(t).quizXp, 0);
  const byType: Partial<Record<TicketType, number>> = {};
  for (const t of done) byType[t.type] = (byType[t.type] ?? 0) + 1;

  const share = done.length ? clean / done.length : 0;
  const rating =
    share >= 0.7 ? { title: "Outstanding" } : share >= 0.4 ? { title: "Exceeds expectations" } : { title: "Solid progress" };

  const strengths: string[] = [];
  if (done.length > 0) strengths.push(`Shipped ${done.length} ticket${done.length === 1 ? "" : "s"} to real (fictional) customers.`);
  if (clean > 0) strengths.push(`${clean} clean merge${clean === 1 ? "" : "s"}: right first time, no hints.`);
  if (hitl.caught > 0) strengths.push(`Caught ${hitl.caught} of Byte's bugs before they shipped.`);
  if (hitl.trusted > 0) strengths.push(`Checked Byte's good code instead of trusting it blindly (${hitl.trusted}×).`);
  if (withQuiz.length > 0 && quizzesPerfect === withQuiz.length) strengths.push("Every quiz perfect on the first try.");
  if ((byType.review ?? 0) > 0 && falseAlarms === 0) strengths.push("Code reviews with zero false alarms.");
  if (hintsUsed > 0) strengths.push("Asked for a hint when stuck instead of guessing for an hour.");

  let nextStep: string | null = null;
  if (hitl.wavedThrough > 0) nextStep = "Byte got a bug past you. Next season, run the tests before you trust its code.";
  else if (falseAlarms > 0) nextStep = "A few false alarms in reviews. Before flagging a line, say out loud what would go wrong.";
  else if (done.length > 0 && noHints < done.length / 2) nextStep = "Try one more run (or a quick print) before opening a hint. You're closer than you think.";
  else if (done.length > clean) nextStep = "Read the Done-when list before your first run to aim for more first-try merges.";

  return {
    merged: done.length,
    total: tickets.length,
    complete: tickets.length > 0 && done.length === tickets.length,
    clean,
    noHints,
    hintsUsed,
    quizzes: withQuiz.length,
    quizzesPerfect,
    falseAlarms,
    xp,
    learned: done.map((t) => t.newConcept),
    byType,
    rating,
    strengths,
    nextStep,
  };
}
