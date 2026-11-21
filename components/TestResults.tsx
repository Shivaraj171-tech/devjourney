"use client";
import { useState } from "react";
import { runEncouragement } from "@/lib/game/feedback";
import { explainResult, findLocation } from "@/lib/runner/explain";
import type { RunResult, TestResult } from "@/lib/runner/types";
import { InlineMarkdown } from "./Markdown";

const ICON = { pass: "✅", fail: "❌", error: "💥" } as const;

/** Turns `test_exactly_25_dollars_is_free` into "exactly 25 dollars is free". */
function prettyName(name: string, file: string, traceback: string) {
  if (name === "(import)") {
    // Point at the learner's file when the error is in their code, not the check's file.
    const where = findLocation(traceback)?.file ?? file;
    return `Couldn't load ${where}. Check for a typo or syntax error.`;
  }
  return name.replace(/^test_/, "").replace(/_/g, " ");
}

type Props = {
  result: RunResult | null;
  running: boolean;
  /** Offer a "Step through" debugger button on each check. */
  onStepThrough?: (check: TestResult) => void;
  /** `${file}:${name}` of the check being traced right now, if any. */
  tracing?: string | null;
};

export default function TestResults({ result, running, onStepThrough, tracing = null }: Props) {
  // Remember how many checks passed on the previous run, to say "2 more than last time".
  // (React's pattern for adjusting state when a prop changes.)
  const [seen, setSeen] = useState<{ result: RunResult | null; previousPassed?: number }>({ result: null });
  if (result !== seen.result && result && !result.error) {
    const last = seen.result && !seen.result.error ? seen.result.results.filter((r) => r.status === "pass").length : undefined;
    setSeen({ result, previousPassed: last });
  }

  if (running) {
    return <p className="animate-pulse text-sm text-slate-400">Running tests…</p>;
  }
  if (!result) {
    return (
      <div className="space-y-1.5 text-sm text-slate-300">
        <p>
          Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">▶ Run tests</kbd> to check your fix
          <span className="pointer-coarse:hidden"> (or Ctrl/⌘ + Enter)</span>.
        </p>
        <p className="text-slate-400">
          Tip: add <code className="text-slate-200">print(...)</code> anywhere in your code to see what&apos;s going on. Whatever it prints shows up
          under each check as &quot;# printed output&quot;.
        </p>
      </div>
    );
  }
  if (result.error) {
    return (
      <div data-testid="run-error" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
        ⚠️ {result.error}
      </div>
    );
  }
  const passed = result.results.filter((r) => r.status === "pass").length;
  return (
    <div className="space-y-2">
      <p data-testid="run-summary" className={`text-sm font-semibold ${result.passed ? "text-emerald-300" : "text-amber-300"}`}>
        {result.passed ? "All checks passed — ready to merge!" : `${passed} of ${result.results.length} checks passing`}
      </p>
      {!result.passed && (
        <p data-testid="run-encouragement" className="text-xs text-slate-400">
          {runEncouragement(passed, result.results.length, seen.result === result ? seen.previousPassed : undefined)}
        </p>
      )}
      <ul className="space-y-1.5">
        {result.results.map((r) => (
          <li key={`${r.file}-${r.name}`} className="rounded-lg bg-slate-900 p-2.5 text-sm">
            <div className="flex items-start gap-2">
              <span>{ICON[r.status]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                  <div className={`min-w-0 flex-1 ${r.status === "pass" ? "text-slate-300" : "text-white"}`}>{prettyName(r.name, r.file, r.traceback)}</div>
                  {onStepThrough && r.name !== "(import)" && (
                    <button
                      data-testid="step-through"
                      onClick={() => onStepThrough(r)}
                      disabled={tracing !== null}
                      aria-label={`Step through the check: ${prettyName(r.name, r.file, r.traceback)}`}
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                        r.status === "pass"
                          ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                          : "border border-violet-400/40 bg-violet-500/15 font-semibold text-violet-100 hover:bg-violet-500/30"
                      }`}
                    >
                      {tracing === `${r.file}:${r.name}` ? "Tracing…" : "🐞 Step through"}
                    </button>
                  )}
                </div>
                {r.status !== "pass" && <Explained result={r} />}
                {r.output && (
                  <pre className="mt-1.5 overflow-x-auto rounded bg-black/40 p-2 text-xs text-slate-300">
                    <span className="text-slate-400"># printed output{"\n"}</span>
                    {r.output}
                  </pre>
                )}
                {r.status === "error" && r.traceback && (
                  // Syntax errors are easiest to fix with the line number from the traceback.
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-xs text-slate-400">Show traceback</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-xs text-red-200">{r.traceback}</pre>
                  </details>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Explained({ result }: { result: RunResult["results"][number] }) {
  const e = explainResult(result);
  return (
    <div className="mt-1 space-y-1">
      {e && (e.summary || e.location) && (
        <p className="text-xs text-slate-300" data-testid="explanation">
          {e.location && (
            <span className="mr-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-amber-200">
              📍 {e.location.file} line {e.location.line}
            </span>
          )}
          {e.summary && <InlineMarkdown text={e.summary} />}
        </p>
      )}
      <div className="font-mono text-xs break-words text-amber-200">{result.message}</div>
    </div>
  );
}

/**
 * "●●○○ 2/4 ✓  +1 since last run": a compact progress pill that sits next to Run,
 * so the result of a run shows where the learner is looking.
 */
export function CheckPill({ total, result, previousPassed }: { total: number; result: RunResult | null; previousPassed?: number }) {
  if (total === 0) return null;
  const ran = !!result && !result.error;
  const passed = ran ? (result.passed ? total : result.results.filter((r) => r.status === "pass").length) : 0;
  const delta = ran && previousPassed !== undefined ? passed - previousPassed : 0;
  const done = ran && result.passed;
  const tone = done ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : ran ? "border-amber-400/40 bg-amber-500/10 text-amber-100" : "border-slate-700 bg-slate-900 text-slate-300";
  const label = ran
    ? `${passed} of ${total} checks passing${delta > 0 ? `, ${delta} more than last run` : delta < 0 ? `, ${-delta} fewer than last run` : ""}`
    : `${total} checks, not run yet`;
  return (
    <div data-testid="check-pill" role="status" aria-label={label} title={label} className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${tone}`}>
      {total <= 8 && (
        <span aria-hidden className="flex gap-0.5">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i < passed ? (done ? "bg-emerald-400" : "bg-amber-300") : "bg-slate-600"}`} />
          ))}
        </span>
      )}
      <span aria-hidden>
        {ran ? `${passed}/${total}` : `0/${total}`}
        {done ? " ✓" : ""}
      </span>
      {delta !== 0 && (
        <span aria-hidden data-testid="check-delta" className={`rounded-full px-1.5 py-px ${delta > 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
          {delta > 0 ? `+${delta}` : delta} <span className="hidden sm:inline">since last run</span>
        </span>
      )}
    </div>
  );
}
