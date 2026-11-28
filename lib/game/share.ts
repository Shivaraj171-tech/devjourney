// Shareable score text and leaderboard copy helpers.
// Pure functions only, so node can unit-test them.

/** A typical ticket is worth 100-150 XP (base XP plus first-run and quiz bonuses). */
export const TYPICAL_TICKET_XP = 125;

/** Roughly how many tickets cover an XP gap (at least 1). */
export function ticketsForXp(xp: number): number {
  return Math.max(1, Math.round(xp / TYPICAL_TICKET_XP));
}

/** "That's about one ticket." / "That's about 4 tickets." / a gentler line for big gaps. */
export function ticketsAwayText(xp: number): string {
  const n = ticketsForXp(xp);
  if (n === 1) return "That's about one ticket.";
  if (n <= 15) return `That's about ${n} tickets.`;
  return "Keep shipping: every ticket closes the gap.";
}

/** e.g. "I caught 7 of 9 of Byte's AI bugs on DevJourney. …". */
export function hitlShareText(caught: number, seen: number, url: string): string {
  return (
    `I caught ${caught} of ${seen} of Byte's AI bugs on DevJourney. ` +
    `Learn Python by checking an AI teammate's code. Can you beat my score? ${url}`
  );
}
