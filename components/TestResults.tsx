"use client";
import { explainResult, findLocation } from "@/lib/runner/explain";
import type { RunResult, TestResult } from "@/lib/runner/types";

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
  if (running) {
    return <p className="animate-pulse text-sm text-slate-400">Running tests…</p>;
  }
  if (!result) {
    return (
      <p className="text-sm text-slate-500">
        Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">Run tests</kbd> (or Ctrl/⌘ + Enter) to check your fix.
        <br />
        <span className="text-slate-600">
          Tip: add <code className="text-slate-400">print(...)</code> anywhere in your code to see what&apos;s going on. Whatever it prints shows up
          under each check as &quot;# printed output&quot;.
        </span>
      </p>
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
                    <span className="text-slate-500"># printed output{"\n"}</span>
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
          {e.summary}
        </p>
      )}
      <div className="font-mono text-xs break-words text-amber-200">{result.message}</div>
    </div>
  );
}
