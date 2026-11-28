"use client";
import { useState } from "react";
import { runEncouragement } from "@/lib/game/feedback";
import { explainResult, findLocation } from "@/lib/runner/explain";
import type { RunResult, TestResult } from "@/lib/runner/types";
import { InlineMarkdown } from "./Markdown";
import Icon from "@/components/icons/Icon";

/** Check status as drawn marks: a tick, a cross, a burnt pan for a crash. */
const ICON = { pass: "check", fail: "cross", error: "burnt" } as const;

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
  /** The ticket's real number of checks. When the code fails to load, the runner returns one
   *  synthetic "(import)" failure, and "0 of 1" would contradict the "0/2" pill (audit flaw 2). */
  total?: number;
};

export default function TestResults({ result, running, onStepThrough, tracing = null, total }: Props) {
  // Remember how many checks passed on the previous run, to say "2 more than last time".
  // (React's pattern for adjusting state when a prop changes.)
  const [seen, setSeen] = useState<{ result: RunResult | null; previousPassed?: number }>({ result: null });
  if (result !== seen.result && result && !result.error) {
    const last = seen.result && !seen.result.error ? seen.result.results.filter((r) => r.status === "pass").length : undefined;
    setSeen({ result, previousPassed: last });
  }

  if (running) {
    return <p className="animate-pulse text-sm text-slate-300 motion-reduce:animate-none">Running the checks…</p>;
  }
  if (!result) {
    return (
      <div className="space-y-1.5 text-sm text-slate-300">
        <p>
          Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-sans text-slate-100">Run tests</kbd> to check your fix
          <span className="pointer-coarse:hidden"> (or Ctrl/⌘ + Enter)</span>.
        </p>
        <p className="text-slate-300">
          Tip: add <code className="text-slate-200">print(...)</code> anywhere in your code to see what&apos;s going on. Whatever it prints shows up
          under each check as &quot;# printed output&quot;.
        </p>
      </div>
    );
  }
  if (result.error) {
    return (
      <div data-testid="run-error" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
        <Icon name="warning" className="mr-1.5" />
        {result.error}
      </div>
    );
  }
  const passed = result.results.filter((r) => r.status === "pass").length;
  const loadFailed = result.results.some((r) => r.name === "(import)");
  const checkCount = Math.max(total ?? 0, result.results.length);
  return (
    <div className="space-y-2">
      <p data-testid="run-summary" tabIndex={-1} className={`text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-signal ${result.passed ? "text-pass" : "text-ink"}`}>
        {result.passed
          ? "All checks passed. Ready to merge!"
          : loadFailed
            ? `Your code didn't load: 0 of ${checkCount} checks could run`
            : `${passed} of ${checkCount} checks passing`}
      </p>
      {!result.passed && (
        <p data-testid="run-encouragement" className="text-sm text-slate-300">
          {runEncouragement(passed, checkCount, seen.result === result ? seen.previousPassed : undefined, loadFailed)}
        </p>
      )}
      <ul className="space-y-1.5">
        {result.results.map((r) => (
          <li
            key={`${r.file}-${r.name}`}
            data-status={r.status}
            className={`rounded-lg border p-2.5 text-sm ${r.status === "pass" ? "border-pass/40 bg-pass/5" : "border-fail/50 bg-fail/5"}`}
          >
            <div className="flex items-start gap-2">
              <span role="img" aria-label={r.status === "pass" ? "passed" : r.status === "fail" ? "failed" : "crashed"} className={r.status === "pass" ? "text-pass" : "text-fail"}>
                <Icon name={ICON[r.status]} className="h-[1.2em] w-[1.2em]" />
              </span>
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
                      {tracing === `${r.file}:${r.name}` ? (
                        "Tracing…"
                      ) : (
                        <>
                          <Icon name="magnifier" className="mr-1" />
                          Step through
                        </>
                      )}
                    </button>
                  )}
                </div>
                {r.status !== "pass" && <Explained result={r} />}
                {r.output && (
                  <pre className="mt-1.5 overflow-x-auto rounded bg-slate-950/70 p-2 text-xs text-slate-300">
                    <span className="text-slate-300"># printed output{"\n"}</span>
                    {r.output}
                  </pre>
                )}
                {r.status === "error" && r.traceback && (
                  // Syntax errors are easiest to fix with the line number from the traceback.
                  <details className="mt-1.5">
                    <summary className="cursor-pointer py-1 text-xs text-slate-300">Show traceback</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-slate-950/70 p-2 text-xs text-red-200">{r.traceback}</pre>
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
              <Icon name="pin" className="mr-1" />
              Stopped at {e.location.file} line {e.location.line}
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
 * "●●○○ 2/4  +1 since last run": a compact progress pill that sits next to Run,
 * so the result of a run shows where the learner is looking.
 */
export function CheckPill({ total, result, previousPassed }: { total: number; result: RunResult | null; previousPassed?: number }) {
  if (total === 0) return null;
  const ran = !!result && !result.error;
  const passed = ran ? (result.passed ? total : result.results.filter((r) => r.status === "pass").length) : 0;
  const delta = ran && previousPassed !== undefined ? passed - previousPassed : 0;
  const done = ran && result.passed;
  // Green is earned: passing checks are green dots, the rest stay hollow (no amber: amber means "press me").
  const tone = done ? "border-pass/60 bg-pass/15 text-ink" : "border-rule bg-slate-950/60 text-ink";
  const label = ran
    ? `${passed} of ${total} checks passing${delta > 0 ? `, ${delta} more than last run` : delta < 0 ? `, ${-delta} fewer than last run` : ""}`
    : `${total} checks, not run yet`;
  return (
    <div data-testid="check-pill" role="status" aria-label={label} title={label} className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${tone}`}>
      {total <= 8 && (
        <span aria-hidden className="flex gap-0.5">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full border ${i < passed ? "border-pass bg-pass" : ran ? "border-fail" : "border-slate-500"}`} />
          ))}
        </span>
      )}
      <span aria-hidden>
        {ran ? `${passed}/${total}` : `0/${total}`}
        {done && <Icon name="check" className="ml-1" />}
      </span>
      {delta !== 0 && (
        <span aria-hidden data-testid="check-delta" className={`rounded-full px-1.5 py-px ${delta > 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
          {delta > 0 ? `+${delta}` : delta} <span className="hidden sm:inline">since last run</span>
        </span>
      )}
    </div>
  );
}
