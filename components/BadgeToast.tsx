"use client";
// Pops up badges earned since the last office visit. Dismissible, and screen
// readers hear it via aria-live.
import { useState } from "react";
import { BADGES } from "@/lib/game/rules";

export default function BadgeToast({ ids }: { ids: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  const badges = BADGES.filter((b) => ids.includes(b.id));
  if (dismissed || badges.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="badge-toast"
      className="badge-toast fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-sm rounded-2xl border border-amber-400/50 bg-slate-900/95 p-4 shadow-2xl shadow-amber-500/10 sm:left-auto"
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
    </div>
  );
}
