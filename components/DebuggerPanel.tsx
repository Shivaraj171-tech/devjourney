"use client";
// Step-through debugger: replays a recorded trace of one check (see
// lib/runner/tracer.py) one step at a time. The workspace highlights the
// current line in the editor; this panel shows the controls, a caption,
// variables, the call stack, printed output and, at the end, the check's result.
import { useEffect } from "react";
import { checkLabel, diffLocals, resultCaption, stepCaption, timelineLength } from "@/lib/debugger/timeline";
import { explainResult } from "@/lib/runner/explain";
import type { TraceResult } from "@/lib/runner/types";
import { InlineMarkdown } from "./Markdown";

type Props = {
  trace: TraceResult;
  /** 0 .. steps.length; the last position shows the check's result. */
  position: number;
  onPosition: (position: number) => void;
  onClose: () => void;
  /** The code was edited after this trace was recorded. */
  stale: boolean;
  /** The recorded code, path -> text, to show the current line inside the panel. */
  files?: Record<string, string>;
};

/**
 * The line that runs next, with one line of context either side, so the code and
 * the variables can be read together (on a phone the editor is a screen away).
 */
function CurrentLine({ text, line }: { text: string; line: number }) {
  const lines = text.split("\n");
  if (line < 1 || line > lines.length) return null;
  const from = Math.max(1, line - 1);
  const to = Math.min(lines.length, line + 1);
  return (
    <div data-testid="debugger-code" className="mb-2 overflow-hidden rounded-md border border-slate-800 bg-[#1e1e1e] py-1 font-mono text-xs">
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => (
        <div
          key={n}
          data-current={n === line || undefined}
          className={`flex ${n === line ? "bg-yellow-400/15 text-white" : "text-slate-400"}`}
        >
          <span className={`w-8 shrink-0 pr-2 text-right select-none ${n === line ? "text-yellow-300" : "text-slate-500"}`}>
            {n === line ? "▶" : ""}
            {n}
          </span>
          <span className="min-w-0 flex-1 pr-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{lines[n - 1] || " "}</span>
        </div>
      ))}
    </div>
  );
}

/** Arrow keys step, unless the learner is typing in the editor or a form field. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || !!target.closest("input, textarea, select, .monaco-editor");
}

export default function DebuggerPanel({ trace, position, onPosition, onClose, stale, files }: Props) {
  const total = timelineLength(trace);
  const last = total - 1;
  const atEnd = position >= last;
  // At the result position, keep showing the state of the last recorded step.
  const stepIndex = Math.min(position, trace.steps.length - 1);
  const step = trace.steps[stepIndex];
  const changes = !atEnd && step ? diffLocals(trace.steps, stepIndex) : new Map<string, string>();
  const caption = atEnd ? resultCaption(trace) : stepCaption(trace.steps, stepIndex);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // defaultPrevented: the arrow key already moved focus in a tab list.
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight" && position < last) {
        e.preventDefault();
        onPosition(position + 1);
      } else if (e.key === "ArrowLeft" && position > 0) {
        e.preventDefault();
        onPosition(position - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position, last, onPosition]);

  const explained = trace.status === "fail" || trace.status === "error" ? explainResult({ ...trace, status: trace.status }) : null;

  return (
    <div data-testid="debugger" className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">🐞 Step through</div>
          <div className="truncate font-semibold text-white" title={trace.name}>
            {checkLabel(trace.name)}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close the debugger and show the CI checks"
          className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          ✕ Close
        </button>
      </div>

      {stale && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          You changed the code after this run, so line numbers may not match. Run the tests and step through again to see the new version.
        </p>
      )}

      {/* ----- controls ----- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPosition(position - 1)}
          disabled={position <= 0}
          aria-label="Previous step"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ◀ Prev
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={position}
          onChange={(e) => onPosition(Number(e.target.value))}
          aria-label="Step"
          aria-valuetext={`Step ${position + 1} of ${total}`}
          className="min-w-24 flex-1 accent-violet-500"
        />
        <button
          onClick={() => onPosition(position + 1)}
          disabled={atEnd}
          aria-label="Next step"
          className="rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Next ▶
        </button>
        <span data-testid="debugger-position" className="w-full text-xs text-slate-400 tabular-nums sm:w-auto">
          Step {position + 1} of {total}
          <span className="hidden text-slate-400 sm:inline"> · ← → keys</span>
        </span>
      </div>

      {/* ----- caption ----- */}
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        {!atEnd && step && (
          <div className="mb-1 font-mono text-xs text-amber-200">
            📍 {step.file} line {step.line} <span className="text-slate-400">· also highlighted in the editor</span>
          </div>
        )}
        {!atEnd && step && files?.[step.file] !== undefined && <CurrentLine text={files[step.file]} line={step.line} />}
        <p data-testid="debugger-caption" aria-live="polite" className="break-words text-slate-100">
          {caption}
        </p>
      </div>

      {atEnd && (
        <div data-testid="debugger-result" className="rounded-lg bg-slate-950/70 p-3">
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">What the check expected</div>
          {trace.status === "pass" ? (
            <p className="mt-1 text-emerald-300">Everything matched what the check expected.</p>
          ) : (
            <>
              {explained?.summary && (
                <p className="mt-1 text-xs text-slate-300">
                  <InlineMarkdown text={explained.summary} />
                </p>
              )}
              <p className="mt-1 font-mono text-xs break-words text-amber-200">{trace.message}</p>
            </>
          )}
          {trace.steps.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">The check never reached your code, so there were no steps to show.</p>
          )}
        </div>
      )}

      {step && (
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* ----- variables ----- */}
          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Variables in <span className="font-mono normal-case">{step.func}</span>
            </div>
            {step.locals.length === 0 ? (
              <p className="text-xs text-slate-400">No variables yet.</p>
            ) : (
              <table data-testid="debugger-vars" className="w-full table-fixed border-collapse font-mono text-xs">
                <tbody>
                  {step.locals.map(([name, value]) => {
                    const change = changes.get(name);
                    return (
                      <tr
                        key={name}
                        data-var={name}
                        data-changed={change ?? undefined}
                        className={`border-b border-slate-800 ${change ? "bg-amber-400/15" : ""}`}
                      >
                        <td className="w-1/3 py-1 pr-2 align-top break-all text-cyan-200">{name}</td>
                        <td className="py-1 align-top break-all text-slate-100">
                          {value}
                          {change && (
                            <span className="ml-2 rounded bg-amber-400/20 px-1 font-sans text-[10px] text-amber-200">
                              {change === "new" ? "new" : "changed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {step.event === "return" && (
              <p className="mt-1 font-mono text-xs text-emerald-300">
                ↩ returns {step.value}
              </p>
            )}
          </div>

          {/* ----- call stack ----- */}
          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">Call stack</div>
            <ol data-testid="debugger-stack" className="space-y-0.5 font-mono text-xs">
              {step.stack.map((name, i) => (
                <li
                  key={`${i}-${name}`}
                  className={`truncate ${i === step.stack.length - 1 ? "text-white" : "text-slate-400"}`}
                  style={{ paddingLeft: `${Math.min(i, 6) * 0.5}rem` }}
                >
                  {i > 0 && "↳ "}
                  {name}
                </li>
              ))}
            </ol>
            <p className="mt-1 text-[11px] text-slate-400">Top: the check. Bottom: where we are now.</p>
          </div>
        </div>
      )}

      {/* ----- printed output so far ----- */}
      {step?.stdout && (
        <pre data-testid="debugger-output" className="max-h-32 overflow-auto rounded bg-black/40 p-2 text-xs whitespace-pre-wrap text-slate-300">
          <span className="text-slate-400"># printed so far{"\n"}</span>
          {atEnd ? trace.output || step.stdout : step.stdout}
        </pre>
      )}
    </div>
  );
}
