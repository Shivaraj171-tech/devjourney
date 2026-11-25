"use client";
import { useSyncExternalStore } from "react";
import { effectiveTheme } from "./theme";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.("(prefers-color-scheme: light)");
  mq?.addEventListener("change", onChange);
  window.addEventListener("devjourney:theme", onChange);
  return () => {
    mq?.removeEventListener("change", onChange);
    window.removeEventListener("devjourney:theme", onChange);
  };
}

/** The theme shown right now ("system" resolved). Dark in the static HTML. */
export function useEffectiveTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, effectiveTheme, () => "dark");
}
