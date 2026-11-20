// The Bug Bounty board: a side quest of short "mystery bug" tickets with no concept
// label and no lesson (interleaved practice: the learner has to work out which kind
// of bug it is). Each one opens once the ticket that taught its concept is solved,
// and after solving it reveals the kind of bug and links back to that lesson
// (spaced retrieval). Pure functions only (no imports), so node can unit-test them.

export type BountyState = "open" | "locked" | "done";

/** One card on the board, as the HQ sees it (no code, no answer until solved). */
export type BountyCard = {
  id: string;
  number: number;
  title: string;
  /** The bounty: the ticket's base XP (rules.ts BASE_XP[level]); hints cost a little, as on any ticket. */
  xp: number;
  estimatedMinutes: number;
  /** Revealed once solved: "This was an off-by-one bug". */
  bugKind: string;
  /** The ticket that opens this one and whose lesson the reveal links to. */
  requires: { id: string; title: string; number: number; seasonTitle: string } | null;
};

/** open once the required ticket is solved (or straight away without one); done once solved. */
export function bountyState(card: { id: string; requires: { id: string } | null }, isSolved: (id: string) => boolean): BountyState {
  if (isSolved(card.id)) return "done";
  return !card.requires || isSolved(card.requires.id) ? "open" : "locked";
}

/** "off-by-one" -> "an off-by-one", "None" -> "a None" (by the first letter, good enough for our bug names). */
export function withArticle(kind: string): string {
  return /^[aeiou]/i.test(kind) ? `an ${kind}` : `a ${kind}`;
}

/** "This was an off-by-one bug." */
export function revealText(kind: string): string {
  return `This was ${withArticle(kind)} bug.`;
}

/** Where the reveal sends the learner: the lesson on the ticket that taught it, opened. */
export function lessonHref(ticketId: string): string {
  return `/ticket/${ticketId}/#lesson`;
}

/** "3/8 solved", for the board's header. */
export function bountyProgress(states: BountyState[]): { solved: number; open: number; total: number } {
  return {
    solved: states.filter((s) => s === "done").length,
    open: states.filter((s) => s === "open").length,
    total: states.length,
  };
}
