// Game rules: XP, ranks, streaks, badges and the office leaderboard.
// Pure functions only, so they're easy to test and tweak.
import type { Level, TicketType } from "../content/types";
import type { HitlScore } from "./byte";

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
  // Thresholds follow the story: clearing Seasons 1-3 ("Month One") is roughly
  // 3,000-3,500 XP, which is when Maya promotes you to Junior Developer.
  { id: "intern", title: "Intern", minXp: 0, emoji: "🌱" },
  { id: "trusted-intern", title: "Trusted Intern", minXp: 700, emoji: "🌿" },
  { id: "junior", title: "Junior Developer", minXp: 2800, emoji: "💻" },
  { id: "mid", title: "Developer", minXp: 7000, emoji: "🚀" },
  { id: "senior", title: "Senior Developer", minXp: 15000, emoji: "🧠" },
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

/**
 * Consecutive active days ending today (or yesterday, so a streak isn't lost
 * before you've played today).
 *
 * Forgiving: a single missed day is bridged by a "day off" (streak freeze).
 * You start with 1, earn another every 7 streak days, and hold at most 2.
 * Two missed days in a row always end the streak.
 */
export const MAX_FREEZES = 2;

export function currentStreak(activeDays: string[], today: Date): number {
  const days = new Set(activeDays);
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  // Walk backwards from the oldest day so freezes are earned before they're spent.
  const walked: boolean[] = [];
  const probe = new Date(cursor);
  while (true) {
    const active = days.has(dayKey(probe));
    if (!active) {
      const before = new Date(probe);
      before.setDate(before.getDate() - 1);
      if (!days.has(dayKey(before)) || walked.length === 0) break; // 2 missed in a row, or nothing yet
    }
    walked.push(active);
    probe.setDate(probe.getDate() - 1);
  }
  walked.reverse(); // oldest first

  let streak = 0;
  let freezes = 1;
  for (const active of walked) {
    if (active) {
      streak++;
      if (streak % 7 === 0) freezes = Math.min(freezes + 1, MAX_FREEZES);
    } else if (freezes > 0) {
      freezes--;
    } else {
      streak = 0; // the gap couldn't be bridged: count only days after it
    }
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
  /** Review tickets: number of wrongly flagged lines. */
  falseAlarms?: number;
  /** Incident tickets: fixed within the time limit. */
  beatTheClock?: boolean;
};

export type BadgeContext = {
  solved: SolvedInfo[];
  streak: number;
  seasonTicketCounts: Record<string, number>;
  /** Byte decisions across tickets (lib/game/byte.ts). Optional so older callers still work. */
  hitl?: HitlScore;
};

/** Byte badges: catch this many wrong suggestions / pick the best prompt first this often. */
export const BUG_CATCHER_CATCHES = 3;
export const PROMPT_PRO_PICKS = 3;

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
  { id: "eagle-eye", emoji: "🦅", title: "Eagle Eye", description: "Finish a code review with no false alarms.",
    earned: (c) => c.solved.some((s) => s.type === "review" && s.falseAlarms === 0) },
  { id: "firefighter", emoji: "🧯", title: "Firefighter", description: "Fix a production incident before the clock runs out.",
    earned: (c) => c.solved.some((s) => s.type === "incident" && s.beatTheClock === true) },
  { id: "bug-catcher", emoji: "🪤", title: "Bug Catcher", description: `Catch ${BUG_CATCHER_CATCHES} of Byte's wrong suggestions.`,
    earned: (c) => (c.hitl?.caught ?? 0) >= BUG_CATCHER_CATCHES },
  { id: "prompt-pro", emoji: "💬", title: "Prompt Pro", description: `Pick the best prompt for Byte first, ${PROMPT_PRO_PICKS} times.`,
    earned: (c) => (c.hitl?.bestPrompts ?? 0) >= PROMPT_PRO_PICKS },
  { id: "on-fire", emoji: "🔥", title: "On Fire", description: "Keep a 3-day streak.",
    earned: (c) => c.streak >= 3 },
  { id: "week-one", emoji: "🏆", title: "Survived Week One", description: "Finish Season 1.",
    earned: (c) => {
      const total = c.seasonTicketCounts["s01"] ?? 0;
      return total > 0 && c.solved.filter((s) => s.seasonId === "s01").length >= total;
    } },
];

// ---------- Daily warm-up ----------
export const WARMUP_XP = 10;

/** Small stable hash so everyone gets the same pick on the same day. */
function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Today's warm-up: only concepts you've already met (its `after` ticket is
 * solved), preferring ones you haven't done yet. Deterministic per day.
 */
export function pickWarmup<W extends { id: string; after: string }>(
  warmups: W[],
  solvedTicketIds: Set<string>,
  doneWarmupIds: Set<string>,
  day: string,
): W | null {
  const eligible = warmups.filter((w) => solvedTicketIds.has(w.after));
  if (eligible.length === 0) return null;
  const fresh = eligible.filter((w) => !doneWarmupIds.has(w.id));
  const pool = fresh.length > 0 ? fresh : eligible;
  return pool[hash(day) % pool.length];
}

// ---------- Office leaderboard ----------
// There are no accounts yet, so you compete with your (fictional) teammates.
// Sam, the other new hire, keeps learning every day you've been at the company.
export type Teammate = { name: string; role: string; avatar: string; xp: number; isYou?: boolean };

export function teammates(daysSinceStart: number): Teammate[] {
  const samXp = Math.min(150 + daysSinceStart * 90, 3200);
  return [
    { name: "Maya", role: "Tech Lead", avatar: "👩🏾‍💻", xp: 16400 },
    { name: "Byte", role: "AI Assistant", avatar: "🤖", xp: 2200 },
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
