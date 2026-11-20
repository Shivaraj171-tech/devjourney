"use client";
// The payoff inside the "PR merged!" modal: your XP counts up, the rank bar
// fills, a promotion gets its own moment, and clean merges in a row show a
// flow combo. Display only: it never changes XP. Respects prefers-reduced-motion.
import { useEffect, useState } from "react";
import { countUpValue, flowLabel, flowStreak, promotion, rankProgress } from "@/lib/game/juice";
import { RANKS, rankFor } from "@/lib/game/rules";
import { totalXp, useProgress } from "@/lib/progress/store";
import { useReducedMotion } from "@/lib/useReducedMotion";

const DURATION_MS = 1100;

const PROMOTION_LINES: Record<string, string> = {
  "trusted-intern": "Maya: “You've earned some trust around here. I'm giving you bigger tickets.”",
  junior: "Maya: “Month One done. Welcome to the team for real, Junior Developer.”",
  mid: "Maya: “You're not learning the codebase any more. You're shaping it.”",
  senior: "Maya: “Okay. Now you review Byte's pull requests for the whole team.”",
};

/** Counts from `from` to `to` once, on mount. Jumps straight to `to` with reduced motion. */
function useCountUp(from: number, to: number, reduced: boolean): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (reduced || from === to) {
      const id = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      setValue(countUpValue(from, to, elapsed, DURATION_MS));
      if (elapsed < DURATION_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, reduced]);
  return value;
}

export default function MergeJuice({ earned }: { earned: number }) {
  const progress = useProgress();
  // Freeze the numbers when the modal opens: the merge has just been saved.
  const [snap] = useState(() => {
    const after = totalXp(progress);
    return { before: Math.max(0, after - earned), after, flow: flowStreak(Object.values(progress.tickets)) };
  });
  const reduced = useReducedMotion();
  const shown = useCountUp(snap.before, snap.after, reduced);
  const promoted = promotion(snap.before, snap.after, RANKS);
  const { rank } = rankFor(shown);
  const { progress: pct, toNext, next } = rankProgress(shown, RANKS);
  const flow = flowLabel(snap.flow);

  return (
    <div className="mt-4 space-y-3 text-left" data-testid="merge-juice">
      {promoted && (
        <div
          data-testid="promotion"
          role="status"
          className="pop-in promo-shine relative overflow-hidden rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-500/20 via-fuchsia-500/20 to-cyan-500/20 p-3 text-center"
        >
          <div className="text-xs font-semibold tracking-widest text-amber-200 uppercase">Promotion</div>
          <div className="mt-1 text-lg font-bold text-white">
            <span aria-hidden>{promoted.emoji} </span>You&apos;re now a {promoted.title}!
          </div>
          {PROMOTION_LINES[promoted.id] && <p className="mt-1 text-xs text-amber-50/90">{PROMOTION_LINES[promoted.id]}</p>}
        </div>
      )}
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-slate-300">
            {rank.emoji} {rank.title}
          </span>
          <span className="font-mono font-bold text-cyan-300" data-testid="xp-countup" aria-hidden>
            {shown} XP
          </span>
          <span className="sr-only">Your total is now {snap.after} XP.</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-label={next ? `Progress to ${next.title}` : "Top rank reached"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct * 100)}
          data-testid="rank-bar"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {next && toNext !== null ? `${toNext} XP to ${next.emoji} ${next.title}` : "Top rank. The office looks up to you."}
        </div>
      </div>
      {flow && (
        <div data-testid="flow-chip" className="pop-in flex items-center justify-between gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm">
          <span className="font-semibold text-cyan-100">{flow}</span>
          <span className="text-xs text-cyan-200/80">clean merges in a row: first try, no hints</span>
        </div>
      )}
    </div>
  );
}
