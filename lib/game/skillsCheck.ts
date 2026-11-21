// The 12-question skills check (content/assessment/skills-check.yaml), taken
// twice: a "baseline" after onboarding (skippable) and a "final" once the final
// exam (Byte's Week Alone) is reached. Scoring, what the HQ card shows, the
// "Baseline 5/12 → Final 11/12" line, and the certificate's conditions.
// Pure functions only (type imports only), so node can unit-test them.
import type { SkillsCheckItem } from "../content/types";

export type SkillsAttempt = "baseline" | "final";

/** One finished attempt, as saved in progress. */
export type SkillsCheckResult = {
  score: number;
  total: number;
  /** Item id -> index of the choice picked (in the content's order, not the shuffled one). */
  answers: Record<string, number>;
  takenAt: string; // ISO
  /** How many tickets were merged when it was taken (a late "baseline" is less of a baseline). */
  ticketsSolved: number;
};

/** progress.skillsCheck (optional: older saves have none). */
export type SkillsCheckProgress = {
  baseline?: SkillsCheckResult;
  final?: SkillsCheckResult;
  /** The learner chose "Skip for now" on the baseline offer. */
  baselineSkipped?: boolean;
};

/** The "Not sure yet" answer: honest, and scored as wrong. */
export const NOT_SURE = -1;

/** What most people score on the baseline when they're starting out (shown for context). */
export const TYPICAL_BASELINE = "2–5";

/** Number of items answered with the right choice. Unknown ids are ignored. */
export function scoreAnswers(items: Pick<SkillsCheckItem, "id" | "answer">[], answers: Record<string, number>): number {
  return items.filter((item) => answers[item.id] === item.answer).length;
}

/** A result ready to save. */
export function makeResult(
  items: Pick<SkillsCheckItem, "id" | "answer">[],
  answers: Record<string, number>,
  takenAt: Date,
  ticketsSolved: number,
): SkillsCheckResult {
  return { score: scoreAnswers(items, answers), total: items.length, answers: { ...answers }, takenAt: takenAt.toISOString(), ticketsSolved };
}

/**
 * Which attempt /skills-check/ offers now, or null if there's nothing to take.
 * Once the final exam is reached it's the final (taken once); before that, the baseline (once).
 */
export function nextAttempt(sc: SkillsCheckProgress | undefined, finalUnlocked: boolean): SkillsAttempt | null {
  if (finalUnlocked) return sc?.final ? null : "final";
  return sc?.baseline ? null : "baseline";
}

export type SkillsCardState =
  /** Offer the baseline (first visits; hidden again once skipped). */
  | "offer-baseline"
  /** Baseline taken; the final comes with the final exam. */
  | "baseline-done"
  /** The final exam is open: take the final check. */
  | "offer-final"
  /** Final taken. */
  | "done"
  | "hidden";

/** What the small "Skills check" card on the HQ shows. */
export function skillsCardState(sc: SkillsCheckProgress | undefined, finalUnlocked: boolean): SkillsCardState {
  if (sc?.final) return "done";
  if (finalUnlocked) return "offer-final";
  if (sc?.baseline) return "baseline-done";
  return sc?.baselineSkipped ? "hidden" : "offer-baseline";
}

const fraction = (r: SkillsCheckResult) => `${r.score}/${r.total}`;

/** "Baseline 5/12 → Final 11/12", "Baseline 5/12", "Final 11/12", or null if nothing was taken. */
export function comparisonText(sc: SkillsCheckProgress | undefined): string | null {
  const parts = [sc?.baseline && `Baseline ${fraction(sc.baseline)}`, sc?.final && `Final ${fraction(sc.final)}`].filter(Boolean);
  return parts.length ? parts.join(" → ") : null;
}

/** Points gained from baseline to final (null unless both were taken). */
export function improvement(sc: SkillsCheckProgress | undefined): number | null {
  return sc?.baseline && sc.final ? sc.final.score - sc.baseline.score : null;
}

/** The shareable line for the skills check. */
export function skillsShareText(sc: SkillsCheckProgress | undefined, url: string): string {
  const line = comparisonText(sc);
  const gain = improvement(sc);
  const head = line ? `My DevJourney skills check: ${line}` : "I'm taking the DevJourney skills check";
  const tail = gain !== null && gain > 0 ? ` (+${gain}) 📈` : "";
  return `${head}${tail}. Learning to read, debug and catch an AI teammate's code. ${url}`;
}

export type CertificateTicket = { id: string; title: string; solved: boolean };

export type CertificateStatus = {
  eligible: boolean;
  /** What's still missing, in plain words (empty when eligible). */
  missing: string[];
};

/** The certificate needs every final-exam ticket merged and the final skills check taken. */
export function certificateStatus(tickets: CertificateTicket[], sc: SkillsCheckProgress | undefined): CertificateStatus {
  const missing = tickets.filter((t) => !t.solved).map((t) => `Final exam: ${t.title}`);
  if (!sc?.final) missing.push("The final skills check");
  return { eligible: tickets.length > 0 && missing.length === 0, missing };
}

/** The day the certificate was earned: the latest of the final tickets' merges and the final check. */
export function certificateDate(solvedAt: (string | undefined)[], sc: SkillsCheckProgress | undefined): string | null {
  const times = [...solvedAt, sc?.final?.takenAt].map((t) => (t ? Date.parse(t) : NaN)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

/** The certificate's share text: name, verdict, scores and the link. */
export function certificateShareText(name: string, sc: SkillsCheckProgress | undefined, exam: { merged: number; total: number }, url: string): string {
  const who = name === "You" ? "I" : name;
  const scores = comparisonText(sc);
  return (
    `${who} passed "Byte's Week Alone", the DevJourney final exam. Human in the loop: verified ✅ ` +
    `${exam.merged}/${exam.total} exam tickets, no hints${scores ? `, skills check ${scores}` : ""}. ${url}`
  );
}
