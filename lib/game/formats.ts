// Rules for the extra task formats (formats.yaml): "Predict the output",
// "Break Byte's code" and Parsons puzzles. Scoring, answer checking and the
// Python requests sent to the runner (lib/runner/formats.py).
// Pure functions only (no imports with runtime code), so node can unit-test them.
import type { ParsonsBlock, TaskFormatsContent } from "../content/types";

export type FormatKind = "predict" | "break_it" | "parsons";

/** Small bonuses only: a miss costs nothing. */
export const PREDICT_XP = 10;
export const BREAK_IT_XP = 15;
export const PARSONS_XP = 15;
/** Parsons solved after a few checks still earns something. */
export const PARSONS_RETRY_XP = 10;
/** Checks allowed for the full Parsons bonus. */
export const PARSONS_FULL_XP_CHECKS = 2;

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
};

/** True if a ticket has at least one format item (formats.yaml). */
export function hasTaskFormats(ticket: { formats?: TaskFormatsContent }): boolean {
  const f = ticket.formats;
  return !!f && f.predict.length + f.breakIt.length + f.parsons.length > 0;
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

/** Record one break_it / parsons check. Once done, the record never changes (XP can't be farmed). */
export function recordAttempt(
  kind: "break_it" | "parsons",
  rec: FormatRecord | undefined,
  success: boolean,
  extra: { input?: string; order?: number[] } = {},
): FormatRecord {
  if (rec?.done) return rec;
  const attempts = (rec?.attempts ?? 0) + 1;
  const base: FormatRecord = { kind, attempts, done: false, xp: 0 };
  if (!success) return base;
  const xp = kind === "break_it" ? BREAK_IT_XP : parsonsXp(attempts);
  return { ...base, done: true, xp, ...extra };
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
export type FormatRequest = PredictRequest | BreakItRequest | ParsonsRequest;

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
