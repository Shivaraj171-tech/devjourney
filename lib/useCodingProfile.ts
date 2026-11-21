"use client";
// The learner's coding profile (lib/game/profile.ts), computed in the browser from
// saved progress. Nothing is sent anywhere.
import { useMemo } from "react";
import { dayKey } from "./game/rules";
import {
  buildProfile,
  conceptKey,
  detectHabits,
  focusLine,
  masteryMap,
  recommendedBounties,
  type Profile,
  type ProfileContent,
} from "./game/profile";
import { warmupHistory, type Progress } from "./progress/store";

/** Memoised profile; `now` null (static HTML) gives null. */
export function useCodingProfile(progress: Progress, content: ProfileContent | undefined, now: Date | null): Profile | null {
  const day = now ? dayKey(now) : null;
  return useMemo(
    () => (content && day ? buildProfile({ tickets: progress.tickets, warmupLog: warmupHistory(progress), content, today: day }) : null),
    [progress, content, day],
  );
}

/** Habits only (no content needed): what the ticket page uses. */
export function useHabits(progress: Progress) {
  return useMemo(() => detectHabits(progress.tickets), [progress.tickets]);
}

/**
 * What the HQ needs from the profile: mastery for the warm-up scheduler, the Today
 * card's focus line, and the Bug Bounty tickets to recommend.
 */
export function usePersonalization(progress: Progress, content: ProfileContent | undefined, now: Date | null, warmups: { concept: string }[]) {
  const profile = useCodingProfile(progress, content, now);
  return useMemo(() => {
    if (!profile || !content) return { mastery: undefined, focus: null, recommended: [] as string[] };
    const solved = (id: string) => !!progress.tickets[id]?.solved;
    return {
      mastery: warmupMastery(
        profile,
        warmups.map((w) => w.concept),
      ),
      focus: focusLine(profile)?.text ?? null,
      recommended: recommendedBounties(profile, content, solved),
    };
  }, [profile, content, progress.tickets, warmups]);
}

/** Mastery keyed by each warm-up's own concept spelling (e.g. "None"), for the scheduler. */
export function warmupMastery(profile: Profile | null, warmupConcepts: string[]): Record<string, number> | undefined {
  if (!profile) return undefined;
  const m = masteryMap(profile);
  const out: Record<string, number> = {};
  for (const c of warmupConcepts) {
    const v = m[conceptKey(c)];
    if (v !== undefined) out[c] = v;
  }
  return out;
}
