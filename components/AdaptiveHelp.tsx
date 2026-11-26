"use client";
// In-ticket adaptive help (lib/game/help.ts): after 3 failed runs in a row on the
// same check, one suggestion picked from what the code did (error kind, unchanged
// re-runs, edge-case checks) and the learner's habits. An offer, never a penalty;
// "Not now" hides it until the advice changes.
import { useState } from "react";
import type { Ticket } from "@/lib/content/types";
import { adaptiveHelp } from "@/lib/game/help";
import { cleanRunLog } from "@/lib/game/runLog";
import { useProgress, type TicketProgress } from "@/lib/progress/store";
import { useHabits } from "@/lib/useCodingProfile";
import type { RunResult, TestResult } from "@/lib/runner/types";

type Props = {
  ticket: Ticket;
  tp: TicketProgress;
  result: RunResult | null;
  /** Step through a check (undefined while Python isn't ready). */
  onStepThrough?: (check: TestResult) => void;
  /** Show the brief (phone: the lesson and the practice live there). */
  onShowBrief: () => void;
};

/** Open the folded lesson (or a practice item) in the brief and bring it into view. */
function reveal(selector: string, openToggle?: string) {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const toggle = openToggle ? el.querySelector<HTMLButtonElement>(openToggle) : null;
    if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    (toggle ?? el).focus?.({ preventScroll: true });
  }, 50);
}

export default function AdaptiveHelpCard({ ticket, tp, result, onStepThrough, onShowBrief }: Props) {
  const progress = useProgress();
  const habits = useHabits(progress);
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (ticket.final || tp.solved) return null;

  const hasTrace = (ticket.formats?.trace?.length ?? 0) > 0;
  const help = adaptiveHelp(
    cleanRunLog(tp.runLog),
    { hasLesson: !!ticket.concept && !ticket.bounty, hasTrace, hintsLeft: Math.max(0, ticket.hints.length - tp.hintsUsed) },
    habits.map((h) => h.id),
  );
  if (!help) return null;
  const key = `${help.id}|${help.check}`;
  if (dismissed === key) return null;

  const check = result?.results.find((r) => r.name === help.check);
  let button: { label: string; onClick: () => void } | null = null;
  if (help.action === "step-through" && check && onStepThrough) button = { label: help.actionLabel ?? "🐞 Step through", onClick: () => onStepThrough(check) };
  if (help.action === "lesson") {
    button = {
      label: help.actionLabel ?? "📘 Re-read the lesson",
      onClick: () => {
        onShowBrief();
        reveal("#lesson", "[data-testid=lesson-toggle]");
      },
    };
  }
  if (help.action === "trace") {
    button = {
      label: help.actionLabel ?? "Try the trace table",
      onClick: () => {
        onShowBrief();
        reveal("[data-testid=format-trace-0]");
      },
    };
  }

  return (
    <aside
      data-testid="adaptive-help"
      data-help={help.id}
      aria-label="A suggestion for your next step"
      className="mb-3 rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-sm text-cyan-50"
    >
      <p className="font-semibold text-white">
        <span aria-hidden>🧭 </span>
        {help.title}
      </p>
      <p className="mt-1 text-cyan-50/90">{help.body}</p>
      {help.action === "hint" && <p className="mt-1 text-cyan-50/90">Open 💡 Hints next to Run when you&apos;re ready.</p>}
      <p className="mt-1 text-xs text-cyan-200" data-testid="adaptive-help-why">
        Why this: {help.because} Picked from your runs and your coding profile.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {button && (
          <button data-testid="adaptive-help-action" onClick={button.onClick} className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
            {button.label}
          </button>
        )}
        <button
          data-testid="adaptive-help-dismiss"
          onClick={() => setDismissed(key)}
          className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/15"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
