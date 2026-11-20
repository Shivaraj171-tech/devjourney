// Rules for the extra task formats (formats.yaml): "Predict the output",
// "Break Byte's code", Parsons puzzles and trace tables. Scoring, answer checking and the
// Python requests sent to the runner (lib/runner/formats.py).
// Pure functions only (no imports with runtime code), so node can unit-test them.
import type { ParsonsBlock, TaskFormatsContent } from "../content/types";

export type FormatKind = "predict" | "break_it" | "parsons" | "trace";

/** Small bonuses only: a miss costs nothing. */
export const PREDICT_XP = 10;
export const BREAK_IT_XP = 15;
export const PARSONS_XP = 15;
/** Parsons solved after a few checks still earns something. */
export const PARSONS_RETRY_XP = 10;
/** Checks allowed for the full Parsons bonus. */
export const PARSONS_FULL_XP_CHECKS = 2;
/** Trace table: every cell right within TRACE_FULL_XP_CHECKS checks, else the smaller bonus. */
export const TRACE_XP = 15;
export const TRACE_RETRY_XP = 10;
export const TRACE_FULL_XP_CHECKS = 2;

/** What the learner did on one format item (saved in progress under formatKey()). */
export type FormatRecord = {
  kind: FormatKind;
  /** Checks run (predict: 1 once predicted). Invalid break_it inputs don't count. */
  attempts: number;
  /** Predict: predicted. Break it: broke the code. Parsons: passed. */
  done: boolean;
  xp: number;
  /** Predict: the learner's prediction, and whether it matched. */
  prediction?: string;
  correct?: boolean;
  /** Break it: the input that broke Byte's code. Parsons: the winning order (block ids). */
  input?: string;
  order?: number[];
  /** Trace table: the learner's winning grid (rows x watched variables). */
  cells?: string[][];
  /** Trace table: "Watch it run" was opened before every cell was right (smaller bonus). */
  watched?: boolean;
};

/** True if a ticket has at least one format item (formats.yaml). */
export function hasTaskFormats(ticket: { formats?: TaskFormatsContent }): boolean {
  const f = ticket.formats;
  return !!f && f.predict.length + f.breakIt.length + f.parsons.length + (f.trace?.length ?? 0) > 0;
}

/** Progress key for item `index` of a format, e.g. "parsons:0". */
export function formatKey(kind: FormatKind, index: number): string {
  return `${kind}:${index}`;
}

/** Printed output, ignoring trailing spaces and blank lines at the ends (same rule as formats.py). */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

/**
 * A free-text prediction is right if it matches the real output once spacing is
 * normalised: spaces at line ends and runs of spaces don't matter, case and quotes do
 * (`None` is not `none`, and `'Ana'` is not `Ana`).
 */
export function predictionMatches(prediction: string, answer: string): boolean {
  const squash = (s: string) =>
    normalizeOutput(s)
      .split("\n")
      .map((line) => line.trim().replace(/\s+/g, " "))
      .join("\n");
  return squash(prediction) === squash(answer);
}

export function predictXp(correct: boolean): number {
  return correct ? PREDICT_XP : 0;
}

export function parsonsXp(checks: number): number {
  return checks <= PARSONS_FULL_XP_CHECKS ? PARSONS_XP : PARSONS_RETRY_XP;
}

/** Record a prediction (the first one counts; later calls change nothing). */
export function recordPrediction(rec: FormatRecord | undefined, prediction: string, correct: boolean): FormatRecord {
  if (rec?.done) return rec;
  return { kind: "predict", attempts: 1, done: true, prediction, correct, xp: predictXp(correct) };
}

/** Trace table bonus: full within TRACE_FULL_XP_CHECKS checks (without peeking), smaller after. Never 0. */
export function traceXp(checks: number, watched = false): number {
  return checks <= TRACE_FULL_XP_CHECKS && !watched ? TRACE_XP : TRACE_RETRY_XP;
}

export type AttemptKind = "break_it" | "parsons" | "trace";
export type AttemptExtra = { input?: string; order?: number[]; cells?: string[][] };

/** Record one break_it / parsons / trace check. Once done, the record never changes (XP can't be farmed). */
export function recordAttempt(kind: AttemptKind, rec: FormatRecord | undefined, success: boolean, extra: AttemptExtra = {}): FormatRecord {
  if (rec?.done) return rec;
  const attempts = (rec?.attempts ?? 0) + 1;
  const base: FormatRecord = { kind, attempts, done: false, xp: 0, ...(rec?.watched ? { watched: true } : {}) };
  if (!success) return base;
  const xp = kind === "break_it" ? BREAK_IT_XP : kind === "parsons" ? parsonsXp(attempts) : traceXp(attempts, rec?.watched);
  return { ...base, done: true, xp, ...extra };
}

/** Trace table: the learner opened "Watch it run" (the real values). Unchanged once done or already watched. */
export function recordWatched(rec: FormatRecord | undefined): FormatRecord {
  if (rec && (rec.done || rec.watched)) return rec;
  return { kind: "trace", attempts: rec?.attempts ?? 0, done: false, xp: 0, watched: true };
}

/** All format XP on one ticket. */
export function formatsXp(records: Record<string, FormatRecord> | undefined): number {
  return Object.values(records ?? {}).reduce((sum, r) => sum + (r.xp ?? 0), 0);
}

// ---------- Python requests (handled by lib/runner/formats.py) ----------

export type PredictRequest = { kind: "predict"; code: string };
export type BreakItRequest = {
  kind: "break_it";
  code: string;
  helpers: string;
  call: string;
  check: string;
  input: string;
  crash_counts: boolean;
};
export type ParsonsRequest = { kind: "parsons"; program: string; check: string; expected_output?: string };
/** Trace table: answers are the learner's grid ("" = same as the row above). */
export type TraceRequest = { kind: "trace"; code: string; watch: string[]; answers?: string[][] };
export type FormatRequest = PredictRequest | BreakItRequest | ParsonsRequest | TraceRequest;

/** formats.run_snippet() */
export type SnippetResult = { stdout: string; error: string | null; error_type: string | null };
/** formats.break_it() */
export type BreakItResult = {
  status: "broken" | "holds" | "invalid" | "crashed";
  message: string;
  result: string | null;
  stdout: string;
};
/** formats.parsons() */
export type ParsonsResult = { passed: boolean; stdout: string; error: string | null; error_type: string | null };

/** One row of a real trace table: the line that just ran and each watched value (a repr, null = not set yet). */
export type TraceRow = { line: number; values: (string | null)[] };
/** formats.trace_table() */
export type TraceTableResult = {
  rows: TraceRow[];
  stdout: string;
  truncated: boolean;
  error: string | null;
  /** Only when answers were sent: right/wrong per cell, one row per real row. */
  cells?: boolean[][];
  first_wrong?: number | null;
  all_right?: boolean;
};

export function traceRequest(task: { code: string; watch: string[] }, answers?: string[][]): TraceRequest {
  const req: TraceRequest = { kind: "trace", code: task.code, watch: task.watch };
  if (answers) req.answers = answers;
  return req;
}

/** An empty trace-table grid: `rows` rows of one "" per watched variable. */
export function emptyTraceGrid(rows: number, columns: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => ""));
}

/** At least one cell typed in (Check stays disabled on an empty table). */
export function traceGridStarted(grid: string[][]): boolean {
  return grid.some((row) => row.some((cell) => cell.trim() !== ""));
}

/** What to say after a trace-table check. */
export function traceFeedback(res: TraceTableResult): { tone: "good" | "neutral" | "warn"; text: string } {
  if (res.error) return { tone: "warn", text: `Python couldn't trace it: ${res.error}` };
  if (res.all_right) return { tone: "good", text: "Every cell matches what Python really did." };
  const row = (res.first_wrong ?? 0) + 1;
  return { tone: "neutral", text: `Step ${row} is the first one that doesn't match. Re-trace from there: which line runs next, and what does it change?` };
}

export function breakItRequest(
  task: { code: string; helpers: string; call: string; check: string; crashCounts: boolean },
  input: string,
): BreakItRequest {
  return { kind: "break_it", code: task.code, helpers: task.helpers, call: task.call, check: task.check, input, crash_counts: task.crashCounts };
}

/** The call as the learner reads it, e.g. split_bill(1000, 3). */
export function callPreview(call: string, input: string): string {
  return call.replace("{input}", input.trim() || "…");
}

/** What to tell the learner after a break_it check. */
export function breakItFeedback(res: BreakItResult, miss: string): { tone: "good" | "neutral" | "warn"; text: string } {
  if (res.status === "broken") {
    return {
      tone: "good",
      text: res.result === null ? `${res.message}. That breaks the spec!` : `Byte's code returned ${res.result}, and that breaks the spec!`,
    };
  }
  if (res.status === "holds") {
    return { tone: "neutral", text: `Byte's code returned ${res.result}, which meets the spec. ${miss}`.trim() };
  }
  if (res.status === "crashed") {
    return { tone: "warn", text: `${res.message}. That input is outside what the spec covers: try a valid one.` };
  }
  return { tone: "warn", text: res.message };
}

// ---------- Parsons ----------

/** The learner's program: the chosen blocks' lines in order. */
export function assembleParsons(blocks: ParsonsBlock[], order: number[]): string {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  return order.map((id) => byId.get(id)?.text ?? "").join("\n");
}

/** Distractor blocks the learner used (those with an `explain`). */
export function usedDistractors(blocks: ParsonsBlock[], order: number[]): ParsonsBlock[] {
  const used = new Set(order);
  return blocks.filter((b) => b.explain && used.has(b.id));
}

export function parsonsRequest(task: { check: string; expectedOutput?: string }, blocks: ParsonsBlock[], order: number[]): ParsonsRequest {
  const req: ParsonsRequest = { kind: "parsons", program: assembleParsons(blocks, order), check: task.check };
  if (task.expectedOutput !== undefined) req.expected_output = task.expectedOutput;
  return req;
}

/** Move the item at `from` one step up (-1) or down (+1); unchanged at the ends. */
export function moveItem<T>(list: T[], from: number, step: -1 | 1): T[] {
  const to = from + step;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * Shuffle a puzzle's lines and distractors (with a stable permutation, e.g. from
 * lib/game/shuffle.ts) into blocks. Never returns the correct lines already in order.
 */
export function shuffleParsons(
  lines: string[],
  distractors: { line: string; explain: string }[],
  permutation: number[],
): ParsonsBlock[] {
  const pieces: { text: string; explain?: string; correctAt: number }[] = [
    ...lines.map((text, i) => ({ text, correctAt: i })),
    ...distractors.map((d) => ({ text: d.line, explain: d.explain, correctAt: -1 })),
  ];
  let order = permutation.filter((i) => i < pieces.length);
  const inOrder = (o: number[]) => {
    const seq = o.map((i) => pieces[i].correctAt).filter((c) => c >= 0);
    return seq.every((c, k) => k === 0 || seq[k - 1] < c);
  };
  for (let tries = 0; tries < order.length && inOrder(order); tries++) order = [...order.slice(1), order[0]];
  return order.map((i, id) => {
    const p = pieces[i];
    return p.explain ? { id, text: p.text, explain: p.explain } : { id, text: p.text };
  });
}
