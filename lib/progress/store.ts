"use client";
// Learner progress, saved in the browser's localStorage.
// Every read/write is wrapped in try/catch: storage can be missing or blocked
// (private windows, disabled site data) and the app must still work.
import { useSyncExternalStore } from "react";
import { dayKey, WARMUP_XP } from "../game/rules";

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
};

export type Progress = {
  version: 1;
  playerName: string;
  startedAt: string; // ISO date
  activeDays: string[]; // YYYY-MM-DD
  /** Daily warm-ups by day (YYYY-MM-DD): which one, and whether the first pick was right. */
  warmups?: Record<string, { id: string; correct: boolean }>;
  /** True once the "how it works" intro has been dismissed. */
  onboarded?: boolean;
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
      if (parsed && parsed.version === 1) return { ...fresh(), ...parsed };
    }
  } catch {
    // ignore: fall back to fresh progress
  }
  return fresh();
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
  const tickets = Object.values(p.tickets).reduce((sum, t) => sum + t.solveXp + t.quizXp, 0);
  const warmups = Object.values(p.warmups ?? {}).filter((w) => w.correct).length * WARMUP_XP;
  return tickets + warmups;
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
  /** Record today's warm-up answer (first answer only); counts as an active day. */
  answerWarmup(id: string, correct: boolean) {
    update((p) => {
      const today = dayKey(new Date());
      if (p.warmups?.[today]) return p;
      const activeDays = p.activeDays.includes(today) ? p.activeDays : [...p.activeDays, today];
      return { ...p, activeDays, warmups: { ...p.warmups, [today]: { id, correct } } };
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
};
