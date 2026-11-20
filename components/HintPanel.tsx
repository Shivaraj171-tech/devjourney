"use client";
import { useEffect, useId, useRef, useState } from "react";
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
      <p className="text-sm text-slate-300">
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
          className="w-full rounded-lg border border-dashed border-slate-500 px-3 py-2 text-sm text-slate-200 hover:border-violet-400 hover:text-white"
        >
          💡 Reveal hint {revealed + 1} of {hints.length}
          {!solved && <span className="text-amber-300"> (−{HINT_COST} XP)</span>}
        </button>
      ) : (
        <p className="text-xs text-slate-400">That&apos;s every hint. You&apos;ve got this!</p>
      )}
    </div>
  );
}

/**
 * "💡 Hints (1/3)": a button that opens the staged hints in a small popover,
 * so hints sit next to the action they help with (Run, Submit review…).
 */
export function HintsButton({ placement = "up", ...props }: Props & { placement?: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Esc (focus back on the button) or on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (props.hints.length === 0) return null;
  return (
    // Keep this button at the right end of its row: the popover opens leftwards from it.
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        data-testid="hints-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap ${
          open ? "border-violet-400 bg-violet-500/20 text-white" : "border-slate-600 text-slate-200 hover:border-violet-400 hover:text-white"
        }`}
      >
        💡 Hints ({props.revealed}/{props.hints.length})
      </button>
      {open && (
        <div
          id={id}
          role="region"
          aria-label="Hints"
          data-testid="hints-popover"
          className={`absolute right-0 z-40 max-h-[60vh] w-[min(380px,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-violet-500/40 bg-slate-900 p-4 shadow-2xl shadow-black/60 ${
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <HintPanel {...props} />
        </div>
      )}
    </div>
  );
}
