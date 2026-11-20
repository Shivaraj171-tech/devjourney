// Byte, the office AI: rules for its suggestions (accept / reject / edit), its
// prompt cards, and the learner's "human-in-the-loop" score.
// Pure functions only (no imports with runtime code), so node can unit-test them.

export type ByteDecision = "accept" | "reject" | "edit";

/** What the learner did with Byte's suggestion on one ticket (saved in progress). */
export type SuggestionRecord = {
  decision: ByteDecision;
  /** Copied from the content when deciding, so scores never need the content. */
  correct: boolean;
  /** The ticket's test-run count at the moment of the decision. */
  runsAtDecision: number;
};

/** The learner's first pick on a ticket's "Ask Byte" card (saved in progress). */
export type PromptRecord = { firstPick: number; best: boolean };

/**
 * - caught: rejected a wrong suggestion, or took it and fixed it ("edit") until the tests passed
 * - trusted: accepted (or edited) a correct suggestion and then ran the tests to check it
 * - waved-through: accepted a wrong suggestion as-is and ran it
 * - doubted: rejected a suggestion that was actually right (no penalty)
 * - pending: applied, but not checked yet
 */
export type SuggestionOutcome = "caught" | "trusted" | "waved-through" | "doubted" | "pending";

export const CATCH_XP = 20;
export const TRUST_XP = 10;
export const BEST_PROMPT_XP = 10;

/** The minimum a ticket's progress needs for Byte's rules. */
export type ByteTicketState = {
  runs: number;
  solved: boolean;
  byteSuggestion?: SuggestionRecord;
  bytePrompt?: PromptRecord;
};

/** text with Byte's replacement applied once, or null if `find` isn't in it any more. */
export function applySuggestion(text: string, find: string, replace: string): string | null {
  const at = text.indexOf(find);
  if (at === -1) return null;
  return text.slice(0, at) + replace + text.slice(at + find.length);
}

/** 1-based line where `find` starts in text, or null. */
export function suggestionLine(text: string, find: string): number | null {
  const at = text.indexOf(find);
  return at === -1 ? null : text.slice(0, at).split("\n").length;
}

export function suggestionOutcome(rec: SuggestionRecord, t: { runs: number; solved: boolean }): SuggestionOutcome {
  if (rec.decision === "reject") return rec.correct ? "doubted" : "caught";
  const checked = t.runs > rec.runsAtDecision;
  if (rec.correct) return checked ? "trusted" : "pending";
  if (rec.decision === "edit") return t.solved ? "caught" : "pending";
  return checked ? "waved-through" : "pending";
}

/** Small bonuses only: mistakes cost nothing beyond the missed bonus. */
export function suggestionXp(outcome: SuggestionOutcome): number {
  if (outcome === "caught") return CATCH_XP;
  if (outcome === "trusted") return TRUST_XP;
  return 0;
}

export function promptXp(rec: PromptRecord | undefined): number {
  return rec?.best ? BEST_PROMPT_XP : 0;
}

/** All Byte XP for one ticket. */
export function byteXp(t: ByteTicketState): number {
  const fromSuggestion = t.byteSuggestion ? suggestionXp(suggestionOutcome(t.byteSuggestion, t)) : 0;
  return fromSuggestion + promptXp(t.bytePrompt);
}

export type HitlScore = {
  /** Wrong suggestions rejected or fixed. */
  caught: number;
  /** Wrong suggestions accepted and run as they were. */
  wavedThrough: number;
  /** Correct suggestions accepted and checked. */
  trusted: number;
  /** Correct suggestions rejected. */
  doubted: number;
  /** Applied but not checked yet (not counted in the ratios). */
  pending: number;
  /** Prompt cards where the best prompt was picked first. */
  bestPrompts: number;
  /** Prompt cards answered. */
  promptsTried: number;
};

/** The human-in-the-loop score across every ticket's progress. */
export function hitlScore(tickets: ByteTicketState[]): HitlScore {
  const score: HitlScore = { caught: 0, wavedThrough: 0, trusted: 0, doubted: 0, pending: 0, bestPrompts: 0, promptsTried: 0 };
  for (const t of tickets) {
    if (t.byteSuggestion) {
      const outcome = suggestionOutcome(t.byteSuggestion, t);
      if (outcome === "caught") score.caught++;
      else if (outcome === "waved-through") score.wavedThrough++;
      else if (outcome === "trusted") score.trusted++;
      else if (outcome === "doubted") score.doubted++;
      else score.pending++;
    }
    if (t.bytePrompt) {
      score.promptsTried++;
      if (t.bytePrompt.best) score.bestPrompts++;
    }
  }
  return score;
}

/** Bugs Byte tried to ship past you (resolved ones only). */
export function wrongSeen(s: HitlScore): number {
  return s.caught + s.wavedThrough;
}

/** Correct suggestions you've judged. */
export function correctSeen(s: HitlScore): number {
  return s.trusted + s.doubted;
}

/** e.g. "Caught 4 of 5 of Byte's bugs · 3/4 best prompts". Empty string if there's nothing yet. */
export function hitlSummary(s: HitlScore): string {
  const parts: string[] = [];
  if (wrongSeen(s) > 0) parts.push(`Caught ${s.caught} of ${wrongSeen(s)} of Byte's bugs`);
  if (correctSeen(s) > 0) parts.push(`trusted ${s.trusted}/${correctSeen(s)} good suggestions`);
  if (s.promptsTried > 0) parts.push(`${s.bestPrompts}/${s.promptsTried} best prompts`);
  const text = parts.join(" · ");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

/** Share of judgement calls that were right (0-1), or null with no resolved calls yet. */
export function hitlAccuracy(s: HitlScore): number | null {
  const calls = wrongSeen(s) + correctSeen(s) + s.promptsTried;
  if (calls === 0) return null;
  return (s.caught + s.trusted + s.bestPrompts) / calls;
}
