"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * True while the CSS media query matches. Always false during the static HTML
 * render and hydration (there is no screen yet), so only use it for parts of a
 * page that render after `useIsClient()` is true.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The ticket page switches from the phone stepper to two columns at Tailwind's `lg` (1024px). */
export const DESKTOP_QUERY = "(min-width: 1024px)";
