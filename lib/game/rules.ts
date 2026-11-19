// Game rules: XP, ranks, streaks, badges and the office leaderboard.
// Pure functions only, so they're easy to test and tweak.
import type { Level, TicketType } from "../content/types";

// ---------- XP ----------
export const BASE_XP: Record<Level, number> = { intern: 100, junior: 150, mid: 200, senior: 300 };
export const HINT_COST = 20;
export const FIRST_RUN_BONUS = 25;
export const QUIZ_XP_PER_CORRECT = 15;

export type SolveXp = { base: number; hintPenalty: number; firstRunBonus: number; total: number };

/** XP for passing a ticket's tests. Hints cost XP but never take more than 60% of the base. */
export function solveXp(level: Level, hintsUsed: number, runs: number): SolveXp {
  const base = BASE_XP[level];
  const hintPenalty = Math.min(hintsUsed * HINT_COST, Math.round(base * 0.6));
  const firstRunBonus = runs === 1 ? FIRST_RUN_BONUS : 0;
  return { base, hintPenalty, firstRunBonus, total: base - hintPenalty + firstRunBonus };
}

/** XP for a quiz: only answers that were right on the first try count. */
export function quizXp(correctFirstTry: number): number {
  return correctFirstTry * QUIZ_XP_PER_CORRECT;
}

/** Read tickets have no tests: the quiz is the task, worth the level's base XP. */
export function readTicketXp(level: Level, correctFirstTry: number, total: number, hintsUsed: number) {
  if (total === 0) return 0;
  const base = Math.round((BASE_XP[level] * correctFirstTry) / total);
  return Math.max(0, base - Math.min(hintsUsed * HINT_COST, Math.round(base * 0.6)));
}

// ---------- Ranks ----------
export const RANKS = [
  { id: "intern", title: "Intern", minXp: 0, emoji: "🌱" },
  { id: "junior", title: "Junior Developer", minXp: 600, emoji: "💻" },
  { id: "mid", title: "Developer", minXp: 2000, emoji: "🚀" },
  { id: "senior", title: "Senior Developer", minXp: 5000, emoji: "🧠" },
] as const;

export type Rank = (typeof RANKS)[number];

export function rankFor(xp: number): { rank: Rank; next: Rank | null; progress: number } {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].minXp) i++;
  const rank = RANKS[i];
  const next = RANKS[i + 1] ?? null;
  const progress = next ? (xp - rank.minXp) / (next.minXp - rank.minXp) : 1;
  return { rank, next, progress };
}

// ---------- Streaks ----------
/** Local date as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Consecutive active days ending today (or yesterday, so a streak isn't lost before you play). */
export function currentStreak(activeDays: string[], today: Date): number {
  const days = new Set(activeDays);
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---------- Badges ----------
export type SolvedInfo = {
  type: TicketType;
  hintsUsed: number;
  runs: number;
  quizPerfect: boolean;
  seasonId: string;
};

export type BadgeContext = {
  solved: SolvedInfo[];
  streak: number;
  seasonTicketCounts: Record<string, number>;
};

export const BADGES: { id: string; emoji: string; title: string; description: string; earned: (c: BadgeContext) => boolean }[] = [
  { id: "first-commit", emoji: "🎉", title: "First Commit", description: "Ship your first ticket.",
    earned: (c) => c.solved.length >= 1 },
  { id: "no-hints", emoji: "🧭", title: "Self-Starter", description: "Solve a ticket without any hints.",
    earned: (c) => c.solved.some((s) => s.hintsUsed === 0) },
  { id: "first-try", emoji: "🎯", title: "Sharpshooter", description: "Pass all tests on your first run.",
    earned: (c) => c.solved.some((s) => s.runs === 1 && s.type !== "read") },
  { id: "quiz-whiz", emoji: "🧠", title: "Quiz Whiz", description: "Get every quiz question right first try.",
    earned: (c) => c.solved.some((s) => s.quizPerfect) },
  { id: "bug-squasher", emoji: "🐛", title: "Bug Squasher", description: "Fix 5 bugs.",
    earned: (c) => c.solved.filter((s) => s.type === "bug").length >= 5 },
  { id: "on-fire", emoji: "🔥", title: "On Fire", description: "Keep a 3-day streak.",
    earned: (c) => c.streak >= 3 },
  { id: "week-one", emoji: "🏆", title: "Survived Week One", description: "Finish Season 1.",
    earned: (c) => {
      const total = c.seasonTicketCounts["s01"] ?? 0;
      return total > 0 && c.solved.filter((s) => s.seasonId === "s01").length >= total;
    } },
];

// ---------- Office leaderboard ----------
// There are no accounts yet, so you compete with your (fictional) teammates.
// Sam, the other new hire, keeps learning every day you've been at the company.
export type Teammate = { name: string; role: string; avatar: string; xp: number; isYou?: boolean };

export function teammates(daysSinceStart: number): Teammate[] {
  const samXp = Math.min(120 + daysSinceStart * 85, 1800);
  return [
    { name: "Maya", role: "Tech Lead", avatar: "👩🏾‍💻", xp: 6400 },
    { name: "Byte", role: "Office Robot", avatar: "🤖", xp: 950 },
    { name: "Sam", role: "New Hire (your rival)", avatar: "🧑‍🎓", xp: samXp },
    { name: "Leo", role: "Customer Support", avatar: "🎧", xp: 340 },
    { name: "Priya", role: "Marketing", avatar: "📣", xp: 220 },
  ];
}

export function leaderboard(you: { name: string; xp: number }, daysSinceStart: number): Teammate[] {
  return [...teammates(daysSinceStart), { name: you.name, role: "You", avatar: "⭐", xp: you.xp, isYou: true }]
    .sort((a, b) => b.xp - a.xp);
}

// ---------- Review & incident tickets ----------
// Kept in their own section so they don't touch the rules above.

/** XP lost for each line flagged in a review that isn't a real problem. */
export const FALSE_ALARM_COST = 10;
/** Extra XP for fixing an incident before its timer runs out. */
export const INCIDENT_SPEED_BONUS = 50;

/** XP breakdown with the extra rows review and incident tickets can have. */
export type TicketXp = SolveXp & { falseAlarmPenalty?: number; speedBonus?: number };

/** Hint penalty used everywhere: HINT_COST each, never more than 60% of the base. */
function hintPenaltyFor(base: number, hintsUsed: number): number {
  return Math.min(hintsUsed * HINT_COST, Math.round(base * 0.6));
}

/**
 * XP for a finished code review: the level's base, minus FALSE_ALARM_COST for every
 * distinct line wrongly flagged (across all submits), minus hints. Never below 0,
 * so flagging every line "just in case" earns nothing.
 */
export function reviewXp(level: Level, falseAlarms: number, hintsUsed: number): TicketXp {
  const base = BASE_XP[level];
  const hintPenalty = hintPenaltyFor(base, hintsUsed);
  const falseAlarmPenalty = Math.min(falseAlarms * FALSE_ALARM_COST, base - hintPenalty);
  return { base, hintPenalty, falseAlarmPenalty, firstRunBonus: 0, total: base - hintPenalty - falseAlarmPenalty };
}

/** Seconds left on an incident timer (negative once it has run out). */
export function incidentSecondsLeft(startedAtMs: number, nowMs: number, limitMinutes: number): number {
  return Math.floor((startedAtMs + limitMinutes * 60_000 - nowMs) / 1000);
}

/** Speed bonus for an incident: INCIDENT_SPEED_BONUS if fixed within the time limit, else 0. */
export function incidentBonus(startedAtMs: number, solvedAtMs: number, limitMinutes: number): number {
  return solvedAtMs - startedAtMs <= limitMinutes * 60_000 ? INCIDENT_SPEED_BONUS : 0;
}

/** XP for fixing an incident: the normal solve XP plus the speed bonus. */
export function incidentXp(level: Level, hintsUsed: number, runs: number, speedBonus: number): TicketXp {
  const xp = solveXp(level, hintsUsed, runs);
  return { ...xp, speedBonus, total: xp.total + speedBonus };
}

/** Result of checking a review: which flags hit real issues, and which were false alarms. */
export type ReviewCheck = { found: number[]; falseAlarms: string[]; passed: boolean };

/**
 * Compare flagged lines ("path:line" keys) with the PR's real issues.
 * `found` lists the indexes of issues that were flagged (on their line or one of their alsoLines).
 */
export function checkReview(
  flags: string[],
  issues: { file: string; line: number; alsoLines: number[] }[],
): ReviewCheck {
  const flagged = new Set(flags);
  const issueKeys = issues.map((i) => [i.line, ...i.alsoLines].map((l) => `${i.file}:${l}`));
  const found = issueKeys.flatMap((keys, idx) => (keys.some((k) => flagged.has(k)) ? [idx] : []));
  const allIssueKeys = new Set(issueKeys.flat());
  const falseAlarms = flags.filter((f) => !allIssueKeys.has(f));
  return { found, falseAlarms, passed: found.length === issues.length };
}
