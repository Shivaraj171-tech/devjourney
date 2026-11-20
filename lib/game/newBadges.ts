// Which badges were earned since the learner last looked at the office?
// `seen` is null on a first visit (nothing stored yet): then nothing pops up,
// so existing players aren't flooded when this feature ships.
export function newlyEarned(seen: string[] | null, earned: string[]): string[] {
  if (seen === null) return [];
  const known = new Set(seen);
  return earned.filter((id) => !known.has(id));
}

export function parseSeenBadges(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}
