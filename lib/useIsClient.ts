"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False during the static HTML render and hydration, true afterwards.
 * Use it to compute date-dependent values (streaks, rival XP) only in the browser,
 * so the static HTML and the first client render always match.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
