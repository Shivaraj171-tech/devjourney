// "What changed since you last looked at the office?" Rooms merged or unlocked
// since the last HQ visit get a one-time animation (a MERGED stamp, a door
// opening). Pure function; the "last seen" snapshot is kept by lib/useOfficeSeen.ts.

export type OfficeSnapshot = { solved: string[]; open: string[] };
export type RoomChange = "merged" | "unlocked";

/**
 * Rooms that became solved / open since `seen`. No snapshot yet (first visit, or
 * storage blocked) means nothing animates: we never replay the whole office.
 */
export function roomChanges(seen: OfficeSnapshot | null, now: OfficeSnapshot): Record<string, RoomChange> {
  if (!seen) return {};
  const wasSolved = new Set(seen.solved);
  const wasOpen = new Set([...seen.open, ...seen.solved]);
  const out: Record<string, RoomChange> = {};
  for (const id of now.solved) if (!wasSolved.has(id)) out[id] = "merged";
  for (const id of now.open) if (!wasOpen.has(id)) out[id] = "unlocked";
  return out;
}

/** Parse a stored snapshot, or null if it's missing or malformed. */
export function parseSnapshot(raw: string | null): OfficeSnapshot | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OfficeSnapshot>;
    if (Array.isArray(v.solved) && Array.isArray(v.open)) {
      return { solved: v.solved.filter((x) => typeof x === "string"), open: v.open.filter((x) => typeof x === "string") };
    }
  } catch {
    // fall through
  }
  return null;
}
