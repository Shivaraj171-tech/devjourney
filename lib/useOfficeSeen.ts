"use client";
// Remembers which rooms the learner has already seen merged/open on the HQ, so
// rooms that changed since the last visit can animate once. A per-browser
// convenience only: if storage is blocked nothing animates and nothing breaks.
import { useEffect, useState } from "react";
import { parseSnapshot, roomChanges, type OfficeSnapshot, type RoomChange } from "./game/rooms";

const KEY = "devjourney:office-seen:v1";

function readSeen(): OfficeSnapshot | null {
  try {
    return parseSnapshot(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

/**
 * Rooms merged or unlocked since the last HQ visit. `ready` must be false until
 * real progress is loaded (the static HTML only has an empty snapshot).
 */
export function useRoomChanges(now: OfficeSnapshot, ready: boolean): Record<string, RoomChange> {
  // Read once per HQ visit: what the office looked like when we last left it.
  const [seen] = useState<OfficeSnapshot | null | undefined>(() => (typeof window === "undefined" ? undefined : readSeen()));
  const solvedKey = now.solved.join(",");
  const openKey = now.open.join(",");
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ solved: solvedKey ? solvedKey.split(",") : [], open: openKey ? openKey.split(",") : [] }));
    } catch {
      // ignore: rooms just won't animate next time
    }
  }, [ready, solvedKey, openKey]);
  return ready && seen !== undefined ? roomChanges(seen, now) : {};
}
