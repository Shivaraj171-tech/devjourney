"use client";
// Extra task formats for a ticket (formats.yaml): "Predict the output",
// "Break Byte's code", "Put the lines in order" and "Trace table". Renders nothing when the
// ticket has none. Self-contained: it saves progress and XP itself.
//
// Mount it anywhere inside a ticket page, ideally sharing the page's Python worker:
//   <TaskFormats ticket={ticket} getRunner={() => runnerRef.current} />
// Without getRunner it starts its own Pyodide worker the first time something runs.
import { useCallback, useEffect, useRef } from "react";
import type { Ticket } from "@/lib/content/types";
import {
  formatKey,
  hasTaskFormats,
  recordAttempt,
  recordPrediction,
  type AttemptExtra,
  type AttemptKind,
  type FormatKind,
} from "@/lib/game/formats";
import { formatActions, ticketProgress, useProgress, type TicketProgress } from "@/lib/progress/store";
import { PythonRunner } from "@/lib/runner/client";
import BreakBytesCode from "./formats/BreakBytesCode";
import ParsonsPuzzle from "./formats/ParsonsPuzzle";
import PredictOutput from "./formats/PredictOutput";
import TraceTable from "./formats/TraceTable";
import type { RunFormat } from "./formats/shared";

export type TaskFormatsProps = {
  /** Only `id` and `formats` are used. */
  ticket: Pick<Ticket, "id" | "formats">;
  /** The ticket's progress. Optional: read from the progress store when left out. */
  tp?: TicketProgress;
  /**
   * The page's PythonRunner, to share one Pyodide worker (recommended: Pyodide is big).
   * Called only when something runs, never during render.
   */
  getRunner?: () => PythonRunner | null;
  /** Called after a format awarded XP (already saved), e.g. to show a toast. */
  onXp?: (xp: number, label: string) => void;
};

export default function TaskFormats({ ticket, tp, getRunner, onXp }: TaskFormatsProps) {
  const progress = useProgress();
  const t = tp ?? ticketProgress(progress, ticket.id);

  // Our own runner, only if the page doesn't share one (created on first use).
  const ownRunner = useRef<PythonRunner | null>(null);
  useEffect(() => () => ownRunner.current?.dispose(), []);
  const run: RunFormat = useCallback(
    (request) => {
      let runner = getRunner?.() ?? null;
      if (!runner) {
        ownRunner.current ??= new PythonRunner();
        runner = ownRunner.current;
      }
      return runner.runSnippet(request);
    },
    [getRunner],
  );

  if (!hasTaskFormats(ticket)) return null;
  const f = ticket.formats!;
  const rec = (kind: FormatKind, i: number) => t.formats?.[formatKey(kind, i)];

  function attempt(kind: AttemptKind, i: number, success: boolean, extra: AttemptExtra, label: string) {
    const key = formatKey(kind, i);
    const before = t.formats?.[key];
    const after = recordAttempt(kind, before, success, extra);
    formatActions.attempt(ticket.id, key, kind, success, extra);
    if (after !== before && after.xp > 0) onXp?.(after.xp, label);
  }

  return (
    <div className="space-y-3" data-testid="task-formats">
      <h2 className="text-sm font-semibold text-white">
        <span aria-hidden>🎯 </span>Practice <span className="font-normal text-slate-400">· small bonus XP, no penalties</span>
      </h2>
      {f.predict.map((task, i) => (
        <PredictOutput
          key={`p${i}`}
          testId={`format-predict-${i}`}
          seed={`${ticket.id}:predict:${i}`}
          task={task}
          record={rec("predict", i)}
          run={run}
          onPredict={(prediction, correct) => {
            const key = formatKey("predict", i);
            const before = t.formats?.[key];
            const after = recordPrediction(before, prediction, correct);
            formatActions.predict(ticket.id, key, prediction, correct);
            if (after !== before && after.xp > 0) onXp?.(after.xp, "Predicted the output");
          }}
        />
      ))}
      {f.breakIt.map((task, i) => (
        <BreakBytesCode
          key={`b${i}`}
          testId={`format-break-it-${i}`}
          seed={`${ticket.id}:break_it:${i}`}
          task={task}
          record={rec("break_it", i)}
          run={run}
          onAttempt={(success, input) => attempt("break_it", i, success, { input }, "Broke Byte's code")}
        />
      ))}
      {f.parsons.map((task, i) => (
        <ParsonsPuzzle
          key={`o${i}`}
          testId={`format-parsons-${i}`}
          seed={`${ticket.id}:parsons:${i}`}
          task={task}
          record={rec("parsons", i)}
          run={run}
          onAttempt={(success, order) => attempt("parsons", i, success, { order }, "Solved the Parsons puzzle")}
        />
      ))}
      {(f.trace ?? []).map((task, i) => (
        <TraceTable
          key={`t${i}`}
          testId={`format-trace-${i}`}
          seed={`${ticket.id}:trace:${i}`}
          task={task}
          record={rec("trace", i)}
          run={run}
          onCheck={(success, cells) => attempt("trace", i, success, { cells }, "Traced it like Python")}
          onWatch={() => formatActions.watch(ticket.id, formatKey("trace", i))}
        />
      ))}
    </div>
  );
}
