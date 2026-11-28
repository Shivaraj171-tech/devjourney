"use client";
// "Trace table" (a notional-machine exercise): be the computer. The learner
// predicts every watched variable's value, one row per line that changes one,
// then "Check" traces the real program in Python (lib/runner/formats.py, using
// the debugger's tracer) and compares cell by cell. The first wrong row is
// highlighted; "Watch it run" replays the real values line by line.
import { useState } from "react";
import type { TraceTask } from "@/lib/content/types";
import {
  emptyTraceGrid,
  TRACE_FULL_XP_CHECKS,
  TRACE_RETRY_XP,
  TRACE_XP,
  traceFeedback,
  traceGridStarted,
  traceRequest,
  type FormatRecord,
  type TraceRow,
  type TraceTableResult,
} from "@/lib/game/formats";
import { InlineCode } from "../ByteSuggestion";
import { FormatCard, ghostButton, Note, primaryButton, type RunFormat } from "./shared";
import Icon from "@/components/icons/Icon";

export type TraceTableProps = {
  task: TraceTask;
  /** Unique per page, e.g. "s01-t04:trace:0" (used for element ids). */
  seed: string;
  record?: FormatRecord;
  /** One check. `cells` is the learner's grid. */
  onCheck: (success: boolean, cells: string[][]) => void;
  /** "Watch it run" opened (the real values are shown). */
  onWatch: () => void;
  run: RunFormat;
  testId?: string;
};

export default function TraceTable({ task, seed, record, onCheck, onWatch, run, testId = "format-trace" }: TraceTableProps) {
  const done = record?.done === true;
  const [grid, setGrid] = useState<string[][]>(() => record?.cells ?? emptyTraceGrid(task.rows, task.watch.length));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TraceTableResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  // "Watch it run": how many real rows are shown (null = closed).
  const [watchStep, setWatchStep] = useState<number | null>(null);
  const [realRows, setRealRows] = useState<TraceRow[] | null>(null);

  const checks = record?.attempts ?? 0;
  const firstWrong = result && !result.all_right ? (result.first_wrong ?? null) : null;

  function setCell(r: number, c: number, value: string) {
    setGrid((g) => g.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)));
    setResult(null);
  }

  async function check() {
    setRunning(true);
    setRunError(null);
    const res = await run<TraceTableResult>(traceRequest(task, grid));
    setRunning(false);
    if ("error" in res) {
      setRunError(res.error);
      return;
    }
    setResult(res.value);
    setRealRows(res.value.rows);
    if (!res.value.error) onCheck(res.value.all_right === true, grid);
  }

  async function watch() {
    let rows = realRows;
    if (!rows) {
      setRunning(true);
      const res = await run<TraceTableResult>(traceRequest(task));
      setRunning(false);
      if ("error" in res) {
        setRunError(res.error);
        return;
      }
      rows = res.value.rows;
      setRealRows(rows);
    }
    setWatchStep(1);
    onWatch();
  }

  const shownRows = realRows && watchStep !== null ? realRows.slice(0, watchStep) : [];
  const currentLine = shownRows.at(-1)?.line;
  const feedback = result ? traceFeedback(result) : null;

  /** A cell's grading: only rows up to the first wrong one are marked, so the learner re-traces from there. */
  const cellState = (r: number, c: number): "right" | "wrong" | null => {
    if (done) return "right";
    if (!result?.cells) return null;
    if (firstWrong !== null && r > firstWrong) return null;
    return result.cells[r]?.[c] ? "right" : "wrong";
  };

  return (
    <FormatCard
      testId={testId}
      title="Trace table"
      subtitle="Be the computer: write down each value, step by step. Then check it against Python."
      done={done}
    >
      <TracedCode code={task.code} highlight={currentLine} testId={`${testId}-code`} />
      <p className="text-xs leading-relaxed text-slate-300">
        A new step each time {task.watch.map((w, i) => (
          <span key={w}>
            {i > 0 && (i === task.watch.length - 1 ? " or " : ", ")}
            <code className="text-amber-200">{w}</code>
          </span>
        ))}{" "}
        gets a new value. Leave a cell <b>empty</b> if it hasn&apos;t changed (or isn&apos;t set yet). Write values the way Python
        shows them: <code className="text-amber-200">&apos;text&apos;</code>, <code className="text-amber-200">[1, 2]</code>.
      </p>

      <div className="overflow-x-auto">
        <table
          id={`${seed}-table`}
          aria-label={`Trace table: ${task.watch.join(", ")}`}
          className="w-full min-w-0 border-separate border-spacing-0 font-mono text-xs"
          data-testid={`${testId}-table`}
        >
          <thead>
            <tr className="text-left text-[11px] text-slate-400">
              <th scope="col" className="w-12 px-1 py-1 font-semibold">Step</th>
              {task.watch.map((w) => (
                <th key={w} scope="col" className="px-1 py-1 font-semibold text-amber-200">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(done && record?.cells ? record.cells : grid).map((row, r) => (
              <tr
                key={r}
                data-testid={`${testId}-row-${r}`}
                data-wrong={firstWrong === r ? "true" : undefined}
                className={firstWrong === r ? "bg-amber-500/15 outline outline-1 outline-amber-400/70" : ""}
              >
                <th scope="row" className="px-1 py-0.5 text-left font-normal text-slate-400">
                  {r + 1}
                  {firstWrong === r && <span className="sr-only"> (first step that doesn&apos;t match)</span>}
                </th>
                {row.map((cell, c) => {
                  const state = cellState(r, c);
                  return (
                    <td key={c} className="px-1 py-0.5">
                      <input
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        readOnly={done}
                        aria-label={`Step ${r + 1}, ${task.watch[c]}`}
                        aria-invalid={state === "wrong" ? true : undefined}
                        data-testid={`${testId}-cell-${r}-${c}`}
                        data-state={state ?? undefined}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        className={`w-full min-w-[4.5rem] rounded border bg-slate-950 px-1.5 py-1 text-slate-100 focus:border-cyan-400 focus:outline-none ${
                          state === "right" ? "border-emerald-500/70" : state === "wrong" ? "border-red-400 bg-red-500/10" : "border-slate-700"
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!done && (
        <button data-testid={`${testId}-check`} onClick={check} disabled={running || !traceGridStarted(grid)} className={`w-full ${primaryButton}`}>
          {running ? "Tracing it in Python…" : "Check against Python"}
        </button>
      )}
      {runError && <Note tone="warn" title="Python couldn't run it">{runError}</Note>}

      {done && (
        <Note testId={`${testId}-success`} tone="good" title={`Every cell right. +${record?.xp ?? 0} XP`}>
          <InlineCode text={task.explain} />
        </Note>
      )}
      {!done && feedback && (
        <Note testId={`${testId}-feedback`} tone={feedback.tone} title={result?.all_right ? "All right" : "Not quite yet"}>
          <p>{feedback.text}</p>
          {checks >= 1 && (
            <p className="mt-1 text-xs text-slate-300">
              All right within {TRACE_FULL_XP_CHECKS} checks: +{TRACE_XP} XP. After that (or after watching it run): +{TRACE_RETRY_XP} XP. A wrong check never costs anything.
            </p>
          )}
        </Note>
      )}

      {(checks > 0 || done) && watchStep === null && (
        <button data-testid={`${testId}-watch-open`} onClick={watch} disabled={running} className={`w-full ${ghostButton}`}>
          Watch it run (show the real values)
        </button>
      )}
      {realRows && watchStep !== null && (
        <WatchItRun
          rows={realRows}
          shown={watchStep}
          watch={task.watch}
          testId={`${testId}-watch`}
          onNext={() => setWatchStep((s) => Math.min((s ?? 0) + 1, realRows.length))}
          onAll={() => setWatchStep(realRows.length)}
          onClose={() => setWatchStep(null)}
          explain={done ? null : task.explain}
        />
      )}
    </FormatCard>
  );
}

/** The program with line numbers (the real trace refers to them), one line highlighted while watching. */
function TracedCode({ code, highlight, testId }: { code: string; highlight?: number; testId: string }) {
  return (
    <pre
      data-testid={testId}
      tabIndex={0}
      aria-label="Python code"
      className="w-0 min-w-full overflow-x-auto rounded-lg border border-slate-800 bg-editor py-2 font-mono text-xs leading-relaxed text-slate-100"
    >
      <code>
        {code.split("\n").map((line, i) => (
          <span
            key={i}
            data-line={i + 1}
            data-current={highlight === i + 1 ? "true" : undefined}
            className={`block pr-2.5 ${highlight === i + 1 ? "bg-violet-500/30" : ""}`}
          >
            <span className="inline-block w-7 pr-2 text-right text-slate-500 select-none" aria-hidden>
              {i + 1}
            </span>
            {line || " "}
          </span>
        ))}
      </code>
    </pre>
  );
}

function WatchItRun({
  rows,
  shown,
  watch,
  testId,
  onNext,
  onAll,
  onClose,
  explain,
}: {
  rows: TraceRow[];
  shown: number;
  watch: string[];
  testId: string;
  onNext: () => void;
  onAll: () => void;
  onClose: () => void;
  explain: string | null;
}) {
  const last = rows[shown - 1];
  return (
    <div data-testid={testId} className="space-y-2 rounded-lg border border-violet-400/40 bg-violet-500/5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-violet-100">What Python really did</h4>
        <button onClick={onClose} className="text-xs text-slate-300 hover:text-white">
          Close
        </button>
      </div>
      <p className="text-xs text-slate-300" role="status">
        Step {shown} of {rows.length}: line {last?.line} just ran (highlighted above).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-400">
              <th scope="col" className="px-1 py-0.5">Step</th>
              <th scope="col" className="px-1 py-0.5">Line</th>
              {watch.map((w) => (
                <th key={w} scope="col" className="px-1 py-0.5 text-amber-200">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((row, r) => (
              <tr key={r} className={r === shown - 1 ? "bg-violet-500/20" : ""}>
                <td className="px-1 py-0.5 text-slate-400">{r + 1}</td>
                <td className="px-1 py-0.5 text-slate-400">{row.line}</td>
                {row.values.map((v, c) => (
                  <td key={c} data-testid={`${testId}-cell-${r}-${c}`} className="px-1 py-0.5 text-slate-100">
                    {v ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown < rows.length ? (
        <div className="flex gap-2">
          <button data-testid={`${testId}-next`} onClick={onNext} className={`flex-1 ${primaryButton}`}>
            Next step
            <Icon name="play" className="ml-1 h-3 w-3" />
          </button>
          <button data-testid={`${testId}-all`} onClick={onAll} className={ghostButton}>
            Show all
          </button>
        </div>
      ) : (
        explain && (
          <p className="text-[13px] text-slate-200">
            <InlineCode text={explain} />
          </p>
        )
      )}
    </div>
  );
}
