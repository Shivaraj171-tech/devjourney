// What unlocks what. Tickets open one after another inside a season; a season
// (an office floor) opens once the nearest ON-CHAIN season before it is complete.
// Off-chain seasons (season.yaml `chain: false`, e.g. the final exam) never gate
// anything themselves, so adding a season before the final needs no code change.
// Pure functions on minimal shapes, so node can unit-test them.

export type OrderSeason = { id: string; chain?: boolean; final?: boolean; tickets: { id: string }[] };

/** Index of the nearest on-chain season before `index`, or -1 if there is none. */
export function previousChainSeasonIndex(seasons: OrderSeason[], index: number): number {
  for (let i = index - 1; i >= 0; i--) if (seasons[i].chain !== false) return i;
  return -1;
}

/** The tickets that must all be solved before season `index` opens ([] = open from the start). */
export function seasonGate(seasons: OrderSeason[], index: number): string[] {
  const prev = previousChainSeasonIndex(seasons, index);
  return prev === -1 ? [] : seasons[prev].tickets.map((t) => t.id);
}

/** Is season `index` open? */
export function seasonOpen(seasons: OrderSeason[], index: number, isSolved: (ticketId: string) => boolean): boolean {
  return seasonGate(seasons, index).every(isSolved);
}

/**
 * The ticket that must be solved before `ticketId` opens: the previous ticket in its
 * season, or for a season's first ticket the last ticket of the nearest on-chain
 * season before it. null if the ticket is open from the start (or unknown).
 */
export function previousTicketId(seasons: OrderSeason[], ticketId: string): string | null {
  for (const [s, season] of seasons.entries()) {
    const i = season.tickets.findIndex((t) => t.id === ticketId);
    if (i === -1) continue;
    if (i > 0) return season.tickets[i - 1].id;
    const prev = previousChainSeasonIndex(seasons, s);
    return prev === -1 ? null : (seasons[prev].tickets.at(-1)?.id ?? null);
  }
  return null;
}

/** Index of the final-exam season (`final: true`), or -1. */
export function finalSeasonIndex(seasons: OrderSeason[]): number {
  return seasons.findIndex((s) => s.final === true);
}
