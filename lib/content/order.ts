// What unlocks what. Tickets open one after another inside a season; a season
// (an office floor) opens once the nearest ON-CHAIN season before it is complete.
// Off-chain seasons (season.yaml `chain: false`, e.g. the final exam) never gate
// anything themselves, so adding a season before the final needs no code change.
// A side quest (off-chain and not the final, e.g. the Bug Bounty board) is never
// gated as a whole: each of its tickets opens once its own `requires` ticket is
// solved (or right away without one), and none of them gates anything.
// A side FLOOR is a side quest opened as a whole by one ticket (season.yaml
// `requires`, e.g. the Robotics Lab after Season 1): a floor of its own, with
// lessons, whose tickets open one after another. It never gates anything either.
// Its `requires` may be another side floor's ticket (Manipulators M2 needs M1's last
// ticket), so modules open in sequence; that only ever gates later side floors, never
// the story or the final exam (sideFloorGate describes it for the HQ's lock line).
// Pure functions on minimal shapes, so node can unit-test them.

export type OrderTicket = { id: string; requires?: string | null };
export type OrderSeason = { id: string; chain?: boolean; final?: boolean; requires?: string | null; tickets: OrderTicket[] };

type Flags = { chain?: boolean; final?: boolean; requires?: string | null };

/** A side quest: off-chain but not the final exam (the Bug Bounty board, or a side floor). */
export function isSideQuest(season: Flags): boolean {
  return season.chain === false && season.final !== true;
}

/** A side floor (e.g. the Robotics Lab): a side quest that one ticket opens as a whole (season.yaml `requires`). */
export function isSideFloor(season: Flags): boolean {
  return isSideQuest(season) && !!season.requires;
}

/** The Bug Bounty kind of side quest: loose cards, each opened by its own ticket's `requires`. */
export function isBountyBoard(season: Flags): boolean {
  return isSideQuest(season) && !season.requires;
}

/** The seasons of the story (on-chain floors and the final exam), side quests left out. */
export function mainSeasons<S extends { chain?: boolean; final?: boolean }>(seasons: S[]): S[] {
  return seasons.filter((s) => !isSideQuest(s));
}

/** Index of the nearest on-chain season before `index`, or -1 if there is none. */
export function previousChainSeasonIndex(seasons: OrderSeason[], index: number): number {
  for (let i = index - 1; i >= 0; i--) if (seasons[i].chain !== false) return i;
  return -1;
}

/** The tickets that must all be solved before season `index` opens ([] = open from the start). */
export function seasonGate(seasons: OrderSeason[], index: number): string[] {
  const season: Flags = seasons[index] ?? {};
  if (isSideFloor(season)) return [season.requires as string];
  if (isSideQuest(season)) return [];
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
 * season before it. In a side quest: the ticket's own `requires`. null if the ticket
 * is open from the start (or unknown).
 */
export function previousTicketId(seasons: OrderSeason[], ticketId: string): string | null {
  for (const [s, season] of seasons.entries()) {
    const i = season.tickets.findIndex((t) => t.id === ticketId);
    if (i === -1) continue;
    if (isSideFloor(season)) return i > 0 ? season.tickets[i - 1].id : (season.requires as string);
    if (isSideQuest(season)) return season.tickets[i].requires ?? null;
    if (i > 0) return season.tickets[i - 1].id;
    const prev = previousChainSeasonIndex(seasons, s);
    return prev === -1 ? null : (seasons[prev].tickets.at(-1)?.id ?? null);
  }
  return null;
}

/**
 * The ticket after `ticketId` in the story ("Next ticket"), skipping side quests.
 * null for the last ticket, and for bounty tickets (back to the office instead).
 * Inside a side floor: the next ticket of that floor (null after its last one).
 */
export function nextStoryTicketId(seasons: OrderSeason[], ticketId: string): string | null {
  const floor = seasons.find((s) => isSideFloor(s) && s.tickets.some((t) => t.id === ticketId));
  if (floor) return floor.tickets[floor.tickets.findIndex((t) => t.id === ticketId) + 1]?.id ?? null;
  const story = mainSeasons(seasons).flatMap((s) => s.tickets.map((t) => t.id));
  const i = story.indexOf(ticketId);
  return i === -1 ? null : (story[i + 1] ?? null);
}

/** Index of the final-exam season (`final: true`), or -1. */
export function finalSeasonIndex(seasons: OrderSeason[]): number {
  return seasons.findIndex((s) => s.final === true);
}

/** What opens a side floor, for the HQ's "🔒 opens after …" line. */
export type FloorGate =
  /** A story ticket: floor = its 1-based story floor number. */
  | { kind: "story"; floor: number; ticketNumber: number; wholeFloor: boolean }
  /** A ticket of another side floor (sequential modules, e.g. Manipulators M2 after M1). */
  | { kind: "side-floor"; seasonId: string; ticketNumber: number; wholeFloor: boolean };

/**
 * Where side floor `index`'s season-level `requires` lives: a story floor, or another
 * side floor (a side floor may require a ticket of another side floor, so modules open
 * one after another). wholeFloor: it is that floor's last ticket. null if unknown.
 */
export function sideFloorGate(seasons: OrderSeason[], index: number): FloorGate | null {
  const season = seasons[index];
  if (!season || !isSideFloor(season)) return null;
  const story = mainSeasons(seasons);
  for (const [s, other] of seasons.entries()) {
    const at = other.tickets.findIndex((t) => t.id === season.requires);
    if (at === -1 || s === index) continue;
    const wholeFloor = at === other.tickets.length - 1;
    if (!isSideQuest(other)) return { kind: "story", floor: story.indexOf(other) + 1, ticketNumber: at + 1, wholeFloor };
    if (isSideFloor(other)) return { kind: "side-floor", seasonId: other.id, ticketNumber: at + 1, wholeFloor };
    return null;
  }
  return null;
}

/** "Floor 1", "ticket #3 of Floor 2", "Manipulators · M1" or "ticket #4 of Manipulators · M1". */
export function floorGateText(gate: FloorGate, sideFloorName: (seasonId: string) => string): string {
  const where = gate.kind === "story" ? `Floor ${gate.floor}` : sideFloorName(gate.seasonId);
  return gate.wholeFloor ? where : `ticket #${gate.ticketNumber} of ${where}`;
}
