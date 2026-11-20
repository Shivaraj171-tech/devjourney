// Daily warm-ups as a small spaced, mixed review session (panel-curriculum.md,
// recommendation 7): up to 3 short questions a day.
//
//   1. Due reviews first. Each warm-up sits in a Leitner box with an expanding
//      interval (1, 3, 7, 14 days). Right first try moves it up a box; a miss
//      sends it back to box 1, so it comes back tomorrow.
//   2. Then new warm-ups for concepts the learner has struggled with (missed
//      warm-ups, wrong first picks in a ticket quiz, a wrong Byte suggestion
//      waved through), most recent and most frequent first.
//   3. Then other new warm-ups, then (only to fill the session) early practice.
// The session mixes concepts: it avoids two items on the same concept while
// another concept is available. Only concepts already unlocked are used.
//
// Pure functions, no runtime imports, so node can unit-test them.

export const WARMUP_SESSION_SIZE = 3;
/** Days until the next review, by Leitner box (box 1 = index 0). */
export const REVIEW_INTERVALS = [1, 3, 7, 14] as const;
export const MAX_BOX = REVIEW_INTERVALS.length;
/** A miss counts half as much after this many days. */
const WEAKNESS_HALF_LIFE_DAYS = 14;

/** One answered warm-up: the first pick of that warm-up on that day (local YYYY-MM-DD). */
export type WarmupAttempt = { id: string; day: string; correct: boolean };

/** The fields of a warm-up the scheduler needs. */
export type WarmupItem = { id: string; concept: string; after: string };

export type CardState = {
  box: number;
  lastDay: string;
  lastCorrect: boolean;
  /** First day it is due again. */
  due: string;
  attempts: number;
};

export type MissSource = "warmup" | "quiz" | "byte";
/** "The learner got something about `concept` wrong on `day`" (`count` times). */
export type MissSignal = { concept: string; source: MissSource; day: string; count: number };

export type PlanReason =
  | { kind: "review"; lastCorrect: boolean; daysAgo: number }
  | { kind: "weak"; concept: string; source: MissSource; daysAgo: number }
  | { kind: "new"; concept: string }
  | { kind: "extra"; concept: string; daysAgo: number };

export type PlannedWarmup<W> = {
  warmup: W;
  reason: PlanReason;
  /** Set once answered today. */
  answer?: { correct: boolean };
};

export type WarmupSession<W> = {
  day: string;
  items: PlannedWarmup<W>[];
  answered: number;
  correctFirstTry: number;
  /** Every item answered (false for an empty session). */
  done: boolean;
};

// ---------- dates (YYYY-MM-DD, calendar arithmetic in UTC so DST never matters) ----------

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function addDays(day: string, n: number): string {
  const d = new Date((dayNumber(day) + n) * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

/** Local calendar day of an ISO timestamp (same format as rules.ts dayKey). */
export function isoToDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- history ----------

/**
 * The warm-up history as one list: the new log plus the old one-per-day record
 * (`warmups: { [day]: { id, correct } }`, saves before spaced warm-ups). Keeps the
 * first answer per warm-up per day, oldest day first.
 */
export function mergeWarmupHistory(
  log: WarmupAttempt[] | undefined,
  legacy: Record<string, { id: string; correct: boolean }> | undefined,
): WarmupAttempt[] {
  const all: WarmupAttempt[] = [
    ...Object.entries(legacy ?? {}).map(([day, w]) => ({ id: w.id, day, correct: !!w.correct })),
    ...(log ?? []),
  ].filter((a) => a && typeof a.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.day));
  const seen = new Set<string>();
  const out: WarmupAttempt[] = [];
  for (const a of all) {
    const key = `${a.day}|${a.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: a.id, day: a.day, correct: a.correct });
  }
  // Stable sort keeps the answer order within a day.
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/** Leitner state of every warm-up that has been answered, replaying the history in order. */
export function cardStates(history: WarmupAttempt[]): Map<string, CardState> {
  const states = new Map<string, CardState>();
  for (const a of history) {
    const prev = states.get(a.id);
    // New cards: right first time starts in box 2 (3 days), a miss in box 1 (tomorrow).
    const box = a.correct ? Math.min((prev?.box ?? 1) + 1, MAX_BOX) : 1;
    states.set(a.id, {
      box,
      lastDay: a.day,
      lastCorrect: a.correct,
      due: addDays(a.day, REVIEW_INTERVALS[box - 1]),
      attempts: (prev?.attempts ?? 0) + 1,
    });
  }
  return states;
}

// ---------- what the learner struggled with ----------

/** The parts of a ticket's saved progress that say where the learner slipped. */
export type TicketSignals = {
  runs: number;
  solvedAt?: string;
  quizDone: boolean;
  quizFirstPick: (number | null)[];
  quizFirstTryCorrect: number;
  byteSuggestion?: { decision: "accept" | "reject" | "edit"; correct: boolean; runsAtDecision: number };
};

/**
 * Miss signals from progress: missed warm-ups, quiz questions not right on the
 * first try, and wrong Byte suggestions accepted as-is and run ("waved through",
 * same rule as lib/game/byte.ts). `ticketConcept` maps ticket id -> its new concept.
 */
export function missSignals(
  history: WarmupAttempt[],
  warmupConcept: Record<string, string>,
  tickets: Record<string, TicketSignals>,
  ticketConcept: Record<string, string>,
): MissSignal[] {
  const out: MissSignal[] = [];
  for (const a of history) {
    const concept = warmupConcept[a.id];
    if (!a.correct && concept) out.push({ concept, source: "warmup", day: a.day, count: 1 });
  }
  for (const [id, t] of Object.entries(tickets)) {
    const concept = ticketConcept[id];
    if (!concept || !t.solvedAt) continue;
    const day = isoToDay(t.solvedAt);
    if (t.quizDone) {
      const answered = (t.quizFirstPick ?? []).filter((p) => p !== null).length;
      const missed = answered - (t.quizFirstTryCorrect ?? 0);
      if (missed > 0) out.push({ concept, source: "quiz", day, count: missed });
    }
    const b = t.byteSuggestion;
    if (b && b.decision === "accept" && !b.correct && t.runs > b.runsAtDecision) {
      out.push({ concept, source: "byte", day, count: 1 });
    }
  }
  return out;
}

type Weakness = { score: number; strongest: MissSignal };

/** Per concept: recent, repeated misses weigh most (half-life of 14 days). */
export function conceptWeakness(signals: MissSignal[], today: string): Map<string, Weakness> {
  const out = new Map<string, Weakness>();
  for (const s of signals) {
    const age = Math.max(0, daysBetween(s.day, today));
    const weight = s.count * Math.pow(0.5, age / WEAKNESS_HALF_LIFE_DAYS);
    const prev = out.get(s.concept);
    const prevStrongestWeight = prev
      ? prev.strongest.count * Math.pow(0.5, Math.max(0, daysBetween(prev.strongest.day, today)) / WEAKNESS_HALF_LIFE_DAYS)
      : -1;
    out.set(s.concept, {
      score: (prev?.score ?? 0) + weight,
      strongest: weight > prevStrongestWeight ? s : prev!.strongest,
    });
  }
  return out;
}

// ---------- the session ----------

/** Small stable hash, so the same day gives the same pick. */
function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Today's warm-up session. Items answered today stay first (in the order they were
 * answered); the rest is scheduled from everything before today, so the plan
 * doesn't reshuffle as you answer.
 */
export function planWarmups<W extends WarmupItem>(input: {
  warmups: W[];
  solvedTicketIds: Set<string>;
  /** Every answered warm-up (mergeWarmupHistory), today's included. */
  history: WarmupAttempt[];
  /** Quiz and Byte misses (warm-up misses are derived from `history`). */
  signals: MissSignal[];
  today: string;
  size?: number;
}): WarmupSession<W> {
  const { warmups, solvedTicketIds, history, today } = input;
  const size = input.size ?? WARMUP_SESSION_SIZE;
  const byId = new Map(warmups.map((w) => [w.id, w]));
  const before = history.filter((a) => a.day < today);
  const states = cardStates(before);
  const conceptOf = Object.fromEntries(warmups.map((w) => [w.id, w.concept]));
  const warmupMisses = missSignals(before, conceptOf, {}, {});
  const weakness = conceptWeakness([...warmupMisses, ...input.signals.filter((s) => s.day < today)], today);
  const weak = (concept: string) => weakness.get(concept)?.score ?? 0;

  const reasonFor = (w: W): { tier: number; reason: PlanReason; key: number[] } => {
    const st = states.get(w.id);
    if (st && st.due <= today) {
      // Missed ones first, then the most overdue, then the weakest concept.
      return {
        tier: 0,
        reason: { kind: "review", lastCorrect: st.lastCorrect, daysAgo: daysBetween(st.lastDay, today) },
        key: [st.lastCorrect ? 1 : 0, -daysBetween(st.due, today), -weak(w.concept)],
      };
    }
    const wk = weakness.get(w.concept);
    if (!st && wk) {
      return {
        tier: 1,
        reason: { kind: "weak", concept: w.concept, source: wk.strongest.source, daysAgo: daysBetween(wk.strongest.day, today) },
        key: [-wk.score],
      };
    }
    if (!st) return { tier: 2, reason: { kind: "new", concept: w.concept }, key: [] };
    return {
      tier: 3,
      reason: { kind: "extra", concept: w.concept, daysAgo: daysBetween(st.lastDay, today) },
      key: [daysBetween(today, st.due)],
    };
  };

  // Answered today: first, in order.
  const items: PlannedWarmup<W>[] = [];
  for (const a of history) {
    if (a.day !== today) continue;
    const w = byId.get(a.id);
    if (!w || items.some((i) => i.warmup.id === w.id)) continue;
    items.push({ warmup: w, reason: reasonFor(w).reason, answer: { correct: a.correct } });
  }

  const candidates = warmups
    .filter((w) => solvedTicketIds.has(w.after) && !items.some((i) => i.warmup.id === w.id))
    .map((w) => ({ w, ...reasonFor(w), tie: hash(`${today}:${w.id}`) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      for (let i = 0; i < Math.max(a.key.length, b.key.length); i++) {
        const d = (a.key[i] ?? 0) - (b.key[i] ?? 0);
        if (d !== 0) return d;
      }
      return a.tie - b.tie;
    });

  const take = (pool: typeof candidates, mixed: boolean) => {
    for (const c of pool) {
      if (items.length >= size) return;
      if (items.some((i) => i.warmup.id === c.w.id)) continue;
      if (mixed && items.some((i) => i.warmup.concept === c.w.concept)) continue;
      items.push({ warmup: c.w, reason: c.reason });
    }
  };
  const scheduled = candidates.filter((c) => c.tier < 3);
  const early = candidates.filter((c) => c.tier === 3);
  take(scheduled, true); // interleave: one item per concept while possible
  take(scheduled, false);
  take(early, true); // nothing else left: practise early
  take(early, false);

  const answered = items.filter((i) => i.answer).length;
  return {
    day: today,
    items,
    answered,
    correctFirstTry: items.filter((i) => i.answer?.correct).length,
    done: items.length > 0 && answered === items.length,
  };
}

// ---------- words ----------

function ago(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** One short line saying why this warm-up is in today's session. */
export function reasonText(reason: PlanReason, label: (concept: string) => string): string {
  switch (reason.kind) {
    case "review":
      return reason.lastCorrect
        ? `Review: you got this right ${ago(reason.daysAgo)}, locking it in`
        : `Review: you missed this ${ago(reason.daysAgo)}`;
    case "weak": {
      const c = label(reason.concept);
      if (reason.source === "quiz") return `Practice: you missed a quiz question on ${c} ${ago(reason.daysAgo)}`;
      if (reason.source === "byte") return `Practice: a wrong Byte suggestion on ${c} got past you ${ago(reason.daysAgo)}`;
      return `Practice: you missed a ${c} warm-up ${ago(reason.daysAgo)}`;
    }
    case "new":
      return `New: ${label(reason.concept)}`;
    case "extra":
      return `Extra practice: ${label(reason.concept)}, last seen ${ago(reason.daysAgo)}`;
  }
}

/** Day the next review falls due after `today` (null if nothing has been answered). */
export function nextReviewDay(history: WarmupAttempt[], today: string): string | null {
  let next: string | null = null;
  for (const st of cardStates(history).values()) {
    const due = st.due > today ? st.due : addDays(today, 1);
    if (next === null || due < next) next = due;
  }
  return next;
}
