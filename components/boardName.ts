// Names on the practice leaderboard. A player can call themselves "Maya" or "Byte", the names of
// two fictional teammates: then the board would list the same name twice. The player's own row
// says "(you)", and a teammate who shares the player's name also says who they are.
import type { Teammate } from "@/lib/game/rules";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function boardName(p: Teammate, playerName: string): string {
  if (p.isYou) return playerName === "You" ? "You" : `${playerName} (you)`;
  return same(p.name, playerName) ? `${p.name} (${p.role})` : p.name;
}
