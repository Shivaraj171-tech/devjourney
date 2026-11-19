"use client";
import Markdown from "./Markdown";
import { HINT_COST } from "@/lib/game/rules";

const LABELS = ["Nudge", "Direction", "Almost the answer"];

type Props = {
  hints: string[];
  revealed: number;
  solved: boolean;
  onReveal: () => void;
};

export default function HintPanel({ hints, revealed, solved, onReveal }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Stuck? Ask a teammate. Each hint costs <span className="font-semibold text-amber-300">{HINT_COST} XP</span>
        {solved ? " (free now, you already solved it)" : ""}. Try on your own first!
      </p>
      {hints.slice(0, revealed).map((hint, i) => (
        <div key={i} className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-slate-200">
          <div className="mb-1 text-xs font-semibold tracking-wide text-violet-300 uppercase">
            Hint {i + 1} · {LABELS[i] ?? "Hint"}
          </div>
          <Markdown text={hint} />
        </div>
      ))}
      {revealed < hints.length ? (
        <button
          onClick={onReveal}
          className="w-full rounded-lg border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-violet-400 hover:text-white"
        >
          💡 Reveal hint {revealed + 1} of {hints.length}
          {!solved && <span className="text-amber-300"> (−{HINT_COST} XP)</span>}
        </button>
      ) : (
        <p className="text-xs text-slate-500">That&apos;s every hint. You&apos;ve got this!</p>
      )}
    </div>
  );
}
