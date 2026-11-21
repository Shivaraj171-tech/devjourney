"use client";
// Learner progress, saved in the browser's localStorage.
// Every read/write is wrapped in try/catch: storage can be missing or blocked
// (private windows, disabled site data) and the app must still work.
import { useSyncExternalStore } from "react";
import { dayKey, WARMUP_XP } from "../game/rules";
import { byteXp, LEGACY_TUTORIAL_TICKETS, type ByteDecision, type PromptRecord, type SuggestionRecord } from "../game/byte";
import {
  formatsXp,
  recordAttempt,
  recordPrediction,
  recordWatched,
  type AttemptExtra,
  type AttemptKind,
  type FormatRecord,
} from "../game/formats";
import type { SkillsAttempt, SkillsCheckProgress, SkillsCheckResult } from "../game/skillsCheck";
import { mergeWarmupHistory, type WarmupAttempt } from "../game/warmups";

const KEY = "devjourney:progress:v1";

export type TicketProgress = {
  /** The learner's current version of each edited file (path -> text). */
  code: Record<string, string>;
  runs: number;
  hintsUsed: number;
  solved: boolean;
  solvedAt?: string;
  /** XP earned for solving (tests or, for read tickets, the quiz). */
  solveXp: number;
  /** One entry per question: index of the first choice picked (null = unanswered). */
  quizFirstPick: (number | null)[];
  /** True once every question has been answered correctly (any number of tries). */
  quizDone: boolean;
  /** How many questions were answered right on the first try (set when the quiz is done). */
  quizFirstTryCorrect: number;
  quizXp: number;
  /** Review tickets: lines currently flagged ("path:line"). */
  reviewFlags?: string[];
  /** Review tickets: the flags from the last "Submit review". */
  reviewSubmitted?: string[];
  /** Review tickets: every distinct wrongly flagged line ever submitted (costs XP). */
  reviewFalseAlarms?: string[];
  /** Incident tickets: when the learner first opened it (ISO). Persisted so a reload doesn't reset the timer. */
  incidentStartedAt?: string;
  /** What the learner did with Byte's suggestion (byte.yaml), if it had one. */
  byteSuggestion?: SuggestionRecord;
  /** First pick on the ticket's "Ask Byte" prompt card. */
  bytePrompt?: PromptRecord;
  /** Extra task formats (formats.yaml), keyed "predict:0", "break_it:0", "parsons:0"... */
  formats?: Record<string, FormatRecord>;
};

export type Progress = {
  version: 1;
  playerName: string;
  startedAt: string; // ISO date
  activeDays: string[]; // YYYY-MM-DD
  /**
   * Old saves only (one warm-up a day): by day (YYYY-MM-DD), which one and whether the
   * first pick was right. Moved into `warmupLog` when progress loads.
   */
  warmups?: Record<string, { id: string; correct: boolean }>;
  /** Every warm-up answered, first pick only, oldest first (lib/game/warmups.ts). */
  warmupLog?: WarmupAttempt[];
  /** True once the "how it works" intro has been dismissed. */
  onboarded?: boolean;
  /** The 12-question skills check: baseline and final results (optional: older saves have none). */
  skillsCheck?: SkillsCheckProgress;
  /**
   * Tickets the learner has opened at least once (the first visit shows the story
   * unfolded, above Byte's card). Optional: older saves have none.
   */
  openedTickets?: string[];
  tickets: Record<string, TicketProgress>;
};

function fresh(): Progress {
  return { version: 1, playerName: "You", startedAt: new Date().toISOString(), activeDays: [], tickets: {} };
}

// Server/first render uses a fixed empty snapshot so hydration matches.
const SERVER_SNAPSHOT: Progress = { version: 1, playerName: "You", startedAt: "1970-01-01T00:00:00.000Z", activeDays: [], tickets: {} };

let state: Progress | null = null;
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Progress;
      if (parsed && parsed.version === 1) return migrate({ ...fresh(), ...parsed });
    }
  } catch {
    // ignore: fall back to fresh progress
  }
  return fresh();
}

/** Bring older saves up to date. Everything new is optional, so this only moves data. */
function migrate(p: Progress): Progress {
  let next = p;
  if (next.warmups) {
    next = { ...next, warmupLog: mergeWarmupHistory(next.warmupLog, next.warmups) };
    delete next.warmups;
  }
  // Byte decisions saved before ticket.yaml had `tutorial`: mark the practice rounds.
  for (const id of LEGACY_TUTORIAL_TICKETS) {
    const t = next.tickets[id];
    if (t?.byteSuggestion && t.byteSuggestion.tutorial === undefined) {
      next = { ...next, tickets: { ...next.tickets, [id]: { ...t, byteSuggestion: { ...t.byteSuggestion, tutorial: true } } } };
    }
  }
  return next;
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore: progress just won't persist
  }
}

function getSnapshot(): Progress {
  if (state === null) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(fn: (draft: Progress) => Progress) {
  state = fn(getSnapshot());
  save();
  for (const l of listeners) l();
}

export function emptyTicket(): TicketProgress {
  return { code: {}, runs: 0, hintsUsed: 0, solved: false, solveXp: 0, quizFirstPick: [], quizDone: false, quizFirstTryCorrect: 0, quizXp: 0 };
}

function updateTicket(id: string, fn: (t: TicketProgress) => TicketProgress) {
  update((p) => {
    const today = dayKey(new Date());
    const activeDays = p.activeDays.includes(today) ? p.activeDays : [...p.activeDays, today];
    return { ...p, activeDays, tickets: { ...p.tickets, [id]: fn({ ...emptyTicket(), ...p.tickets[id] }) } };
  });
}

// ---------- hooks & selectors ----------

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

const EMPTY = emptyTicket();

export function ticketProgress(p: Progress, id: string): TicketProgress {
  const t = p.tickets[id];
  return t ? { ...EMPTY, ...t } : EMPTY;
}

export function totalXp(p: Progress): number {
  const tickets = Object.values(p.tickets).reduce(
    (sum, t) => sum + t.solveXp + t.quizXp + byteXp(t) + formatsXp(t.formats),
    0,
  );
  const warmups = warmupHistory(p).filter((w) => w.correct).length * WARMUP_XP;
  return tickets + warmups;
}

/** Every warm-up answered (old one-a-day saves included), oldest first. */
export function warmupHistory(p: Progress): WarmupAttempt[] {
  return mergeWarmupHistory(p.warmupLog, p.warmups);
}

export function daysSinceStart(p: Progress, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(p.startedAt).getTime()) / 86_400_000));
}

// ---------- actions ----------

export const actions = {
  saveCode(id: string, path: string, text: string) {
    updateTicket(id, (t) => ({ ...t, code: { ...t.code, [path]: text } }));
  },
  resetCode(id: string) {
    updateTicket(id, (t) => ({ ...t, code: {} }));
  },
  /** Record a test run. `xpIfSolved` is awarded only the first time it passes. */
  recordRun(id: string, passed: boolean, xpIfSolved: (runs: number, hintsUsed: number) => number) {
    updateTicket(id, (t) => {
      const runs = t.runs + 1;
      if (t.solved || !passed) return { ...t, runs };
      return { ...t, runs, solved: true, solvedAt: new Date().toISOString(), solveXp: xpIfSolved(runs, t.hintsUsed) };
    });
  },
  revealHint(id: string) {
    updateTicket(id, (t) => ({ ...t, hintsUsed: t.hintsUsed + 1 }));
  },
  /** Record a quiz answer; only the first pick per question counts for XP. */
  answerQuestion(id: string, index: number, choice: number, count: number) {
    updateTicket(id, (t) => {
      const picks = [...t.quizFirstPick];
      while (picks.length < count) picks.push(null);
      if (picks[index] === null) picks[index] = choice;
      return { ...t, quizFirstPick: picks };
    });
  },
  /** Called when every question has been answered correctly. */
  finishQuiz(id: string, quizXp: number, firstTryCorrect: number, solveXp?: number) {
    updateTicket(id, (t) => {
      if (t.quizDone) return t;
      const next = { ...t, quizDone: true, quizXp, quizFirstTryCorrect: firstTryCorrect };
      if (solveXp !== undefined && !t.solved) {
        return { ...next, solved: true, solvedAt: new Date().toISOString(), solveXp };
      }
      return next;
    });
  },
  /** Record a warm-up answer (first pick per warm-up per day only); counts as an active day. */
  answerWarmup(id: string, correct: boolean) {
    update((p) => {
      const today = dayKey(new Date());
      const log = warmupHistory(p);
      if (log.some((a) => a.id === id && a.day === today)) return p;
      const activeDays = p.activeDays.includes(today) ? p.activeDays : [...p.activeDays, today];
      const next: Progress = { ...p, activeDays, warmupLog: [...log, { id, day: today, correct }] };
      delete next.warmups; // now part of warmupLog
      return next;
    });
  },
  finishOnboarding() {
    update((p) => ({ ...p, onboarded: true }));
  },
  setName(name: string) {
    update((p) => ({ ...p, playerName: name.trim().slice(0, 24) || "You" }));
  },
  resetAll() {
    update(() => fresh());
  },
  /** Replace everything with restored progress (validated first by lib/progress/backup.ts). */
  replaceAll(next: Progress) {
    update(() => migrate({ ...fresh(), ...next }));
  },
};

// ---------- review & incident tickets ----------

/** Like updateTicket, but doesn't count as activity for the streak (e.g. just opening a page). */
function patchTicket(id: string, fn: (t: TicketProgress) => TicketProgress) {
  update((p) => ({ ...p, tickets: { ...p.tickets, [id]: fn({ ...emptyTicket(), ...p.tickets[id] }) } }));
}

export const reviewActions = {
  /** Flag or unflag one line ("path:line"). */
  toggleFlag(id: string, key: string) {
    patchTicket(id, (t) => {
      const flags = t.reviewFlags ?? [];
      return { ...t, reviewFlags: flags.includes(key) ? flags.filter((f) => f !== key) : [...flags, key] };
    });
  },
  /**
   * Submit the current flags. `falseAlarms` are the wrong flags in this submit; they are
   * remembered (each line once). If `passed`, the ticket is solved with `xpFor(totalFalseAlarms, hintsUsed)`.
   */
  submit(id: string, falseAlarms: string[], passed: boolean, xpFor: (falseAlarms: number, hintsUsed: number) => number) {
    updateTicket(id, (t) => {
      const allFalse = [...new Set([...(t.reviewFalseAlarms ?? []), ...falseAlarms])];
      const next = { ...t, reviewSubmitted: [...(t.reviewFlags ?? [])], reviewFalseAlarms: allFalse };
      if (t.solved || !passed) return next;
      return { ...next, solved: true, solvedAt: new Date().toISOString(), solveXp: xpFor(allFalse.length, t.hintsUsed) };
    });
  },
};

export const visitActions = {
  /** Remember that a ticket page was opened (not activity for the streak). */
  opened(id: string) {
    if (getSnapshot().openedTickets?.includes(id)) return;
    update((p) => (p.openedTickets?.includes(id) ? p : { ...p, openedTickets: [...(p.openedTickets ?? []), id] }));
  },
};

export const incidentActions = {
  /** Start the incident clock the first time the ticket is opened (no-op afterwards). */
  start(id: string) {
    if (getSnapshot().tickets[id]?.incidentStartedAt) return;
    patchTicket(id, (t) => (t.incidentStartedAt ? t : { ...t, incidentStartedAt: new Date().toISOString() }));
  },
};

// ---------- Byte (the office AI) ----------

export const byteActions = {
  /**
   * Record the learner's decision on Byte's suggestion (first decision only).
   * For "accept" and "edit", `apply` is the file and its new text, saved as the learner's code.
   */
  decide(
    id: string,
    decision: ByteDecision,
    correct: boolean,
    apply?: { path: string; text: string },
    why?: { reason: number; reasonCorrect: boolean },
    tutorial = false,
  ) {
    updateTicket(id, (t) => {
      if (t.byteSuggestion) return t;
      const record: SuggestionRecord = { decision, correct, runsAtDecision: t.runs, ...why, ...(tutorial ? { tutorial: true as const } : {}) };
      const code = apply ? { ...t.code, [apply.path]: apply.text } : t.code;
      return { ...t, code, byteSuggestion: record };
    });
  },
  /** Record the first prompt picked on the "Ask Byte" card; later picks are just for comparing. */
  pickPrompt(id: string, index: number, best: boolean) {
    updateTicket(id, (t) => (t.bytePrompt ? t : { ...t, bytePrompt: { firstPick: index, best } }));
  },
};

// ---------- Extra task formats (formats.yaml) ----------
// Scoring lives in lib/game/formats.ts; these only store its records.

function updateFormat(id: string, key: string, fn: (rec: FormatRecord | undefined) => FormatRecord) {
  updateTicket(id, (t) => {
    const before = t.formats?.[key];
    const after = fn(before);
    return after === before ? t : { ...t, formats: { ...t.formats, [key]: after } };
  });
}

export const formatActions = {
  /** Lock in a "Predict the output" answer (the first one counts). */
  predict(id: string, key: string, prediction: string, correct: boolean) {
    updateFormat(id, key, (rec) => recordPrediction(rec, prediction, correct));
  },
  /** One "Break Byte's code", Parsons or trace-table check. No-op once that item is done. */
  attempt(id: string, key: string, kind: AttemptKind, success: boolean, extra?: AttemptExtra) {
    updateFormat(id, key, (rec) => recordAttempt(kind, rec, success, extra));
  },
  /** Trace table: "Watch it run" opened (the real values shown). */
  watch(id: string, key: string) {
    updateFormat(id, key, (rec) => recordWatched(rec));
  },
};

// ---------- the skills check (lib/game/skillsCheck.ts) ----------

export const skillsCheckActions = {
  /** Save a finished attempt. Each attempt is taken once: a second save is ignored. */
  finish(attempt: SkillsAttempt, result: SkillsCheckResult) {
    update((p) => (p.skillsCheck?.[attempt] ? p : { ...p, skillsCheck: { ...p.skillsCheck, [attempt]: result } }));
  },
  /** "Skip for now" on the baseline offer. */
  skipBaseline() {
    update((p) => ({ ...p, skillsCheck: { ...p.skillsCheck, baselineSkipped: true } }));
  },
};

/** The current record of one format item (undefined if untouched). */
export function formatRecord(t: TicketProgress, key: string): FormatRecord | undefined {
  return t.formats?.[key];
}
