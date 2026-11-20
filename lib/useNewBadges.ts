"use client";
// Remembers which badges the learner has already been shown, so a badge earned
// on a ticket pops up once on the next HQ visit. Per-browser convenience only:
// if storage is blocked, badges simply don't pop up.
import { useEffect, useState } from "react";
import { newlyEarned, parseSeenBadges } from "./game/newBadges";

const KEY = "devjourney:badges-seen:v1";

export function useNewBadges(earned: string[], ready: boolean): string[] {
  const [seen] = useState<string[] | null | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      return parseSeenBadges(window.localStorage.getItem(KEY));
    } catch {
      return null;
    }
  });
  const earnedKey = earned.join(",");
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(earnedKey ? earnedKey.split(",") : []));
    } catch {
      // ignore
    }
  }, [ready, earnedKey]);
  return ready && seen !== undefined ? newlyEarned(seen, earned) : [];
}
