"use client";
// Printed on the merged slip (SolvedModal): your XP counts up, the rank bar fills,
// a promotion is one line with Maya's words, and clean merges in a row show the
// flow count. Display only: it never changes XP. Respects prefers-reduced-motion.
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
    <div className="mt-3 space-y-2 text-sm text-paper-ink" data-testid="merge-juice">
      {promoted && (
        <div data-testid="promotion" role="status">
          <p className="font-bold">Promoted to {promoted.title}.</p>
          {PROMOTION_LINES[promoted.id] && <p className="mt-0.5 text-paper-muted">{PROMOTION_LINES[promoted.id]}</p>}
        </div>
      )}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span>{rank.title}</span>
          <span className="font-mono font-bold tabular-nums" data-testid="xp-countup" aria-hidden>
            {shown} XP
          </span>
          <span className="sr-only">Your total is now {snap.after} XP.</span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-ink/15"
          role="progressbar"
          aria-label={next ? `Progress to ${next.title}` : "Top rank reached"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct * 100)}
          data-testid="rank-bar"
        >
          <div className="h-full rounded-full bg-paper-ink" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-paper-muted">
          {next && toNext !== null ? `${toNext} XP to ${next.title}` : "Top rank. The office looks up to you."}
        </p>
      </div>
      {flow && (
        <p data-testid="flow-chip">
          <b>{flow}</b> <span className="text-paper-muted">clean merges in a row: first try, no hints.</span>
        </p>
      )}
    </div>
  );
}
