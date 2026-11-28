"use client";
// Pops up badges earned since the last office visit. Screen readers hear it via
// aria-live. It dismisses itself after a few seconds so it never sits on top of
// feedback (the warm-up's explanations, for example). Hovering or focusing it
// pauses the countdown; the cross closes it straight away. With reduced motion there is
// no slide-in and no moving countdown bar (the timer still runs).
import { useEffect, useState } from "react";
import { BADGES } from "@/lib/game/rules";
import Icon from "./icons/Icon";

/** How long the toast stays up (unless hovered or focused). */
export const BADGE_TOAST_MS = 6000;

export default function BadgeToast({ ids }: { ids: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const badges = BADGES.filter((b) => ids.includes(b.id));
  const visible = !dismissed && badges.length > 0;
  const paused = hovered || focused;

  // Restarts the full countdown each time the pointer or focus leaves.
  useEffect(() => {
    if (!visible || paused) return;
    const timer = window.setTimeout(() => setDismissed(true), BADGE_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [visible, paused]);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="badge-toast"
      data-paused={paused}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className="badge-toast fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-sm overflow-hidden rounded-lg border border-rule bg-panel p-4 shadow-lg sm:left-auto"
    >
      <div className="flex items-start gap-3">
        <Icon name={badges[0].icon} className="mt-0.5 h-7 w-7 text-ink" />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-slate-300">
            {badges.length === 1 ? "New badge" : `${badges.length} new badges`}
          </div>
          {badges.map((b) => (
            <div key={b.id} className="mt-1">
              <div className="font-semibold text-white">
                {b.title}
              </div>
              <div className="text-xs text-slate-400">{b.description}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-ink">
          <Icon name="cross" className="h-4 w-4" />
        </button>
      </div>
      {/* Time left before it closes by itself (restarted, so keyed on the pause state). */}
      <div
        key={paused ? "paused" : "running"}
        aria-hidden
        className="badge-toast-timer absolute inset-x-0 bottom-0 h-0.5 bg-slate-500"
        style={{ animationDuration: `${BADGE_TOAST_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}
