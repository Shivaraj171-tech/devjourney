"use client";
// Pops up badges earned since the last office visit. Screen readers hear it via
// aria-live. It dismisses itself after a few seconds so it never sits on top of
// feedback (the warm-up's explanations, for example). Hovering or focusing it
// pauses the countdown; ✕ closes it straight away. With reduced motion there is
// no slide-in and no moving countdown bar (the timer still runs).
import { useEffect, useState } from "react";
import { BADGES } from "@/lib/game/rules";

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
      className="badge-toast fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-sm overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-900/95 p-4 shadow-2xl shadow-amber-500/10 sm:left-auto"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{badges[0].emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-widest text-amber-300 uppercase">
            {badges.length === 1 ? "New badge!" : `${badges.length} new badges!`}
          </div>
          {badges.map((b) => (
            <div key={b.id} className="mt-1">
              <div className="font-semibold text-white">
                {b.emoji} {b.title}
              </div>
              <div className="text-xs text-slate-400">{b.description}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">
          ✕
        </button>
      </div>
      {/* Time left before it closes by itself (restarted, so keyed on the pause state). */}
      <div
        key={paused ? "paused" : "running"}
        aria-hidden
        className="badge-toast-timer absolute inset-x-0 bottom-0 h-0.5 bg-amber-400/60"
        style={{ animationDuration: `${BADGE_TOAST_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}
