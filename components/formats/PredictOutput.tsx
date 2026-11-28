"use client";
// "Predict the output" (PRIMM: predict, then run). The learner commits to a
// prediction first (multiple choice or free text), and only then can run the
// code in Python to compare it with what really gets printed.
import { useState } from "react";
import type { PredictTask } from "@/lib/content/types";
import { PREDICT_XP, predictionMatches, type FormatRecord, type SnippetResult } from "@/lib/game/formats";
import { shuffledOrder } from "@/lib/game/shuffle";
import { InlineCode } from "../ByteSuggestion";
import { CodeBlock, FormatCard, Note, primaryButton, type RunFormat } from "./shared";

export type PredictOutputProps = {
  task: PredictTask;
  /** Stable seed for the choice order, e.g. "s01-t02:predict:0". */
  seed: string;
  /** Saved record (undefined until the learner predicts). */
  record?: FormatRecord;
  /** Lock in a prediction. `correct` is already worked out. */
  onPredict: (prediction: string, correct: boolean) => void;
  run: RunFormat;
  testId?: string;
};

export default function PredictOutput({ task, seed, record, onPredict, run, testId = "format-predict" }: PredictOutputProps) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [actual, setActual] = useState<SnippetResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const locked = record?.done === true;
  const choices = task.choices;
  const multiLine = task.answer.includes("\n");
  const draft = choices ? (choice === null ? "" : choices[choice]) : text;

  function lockIn() {
    if (!draft.trim()) return;
    onPredict(draft, predictionMatches(draft, task.answer));
  }

  async function runIt() {
    setRunning(true);
    setRunError(null);
    const res = await run<SnippetResult>({ kind: "predict", code: task.code });
    setRunning(false);
    if ("error" in res) setRunError(res.error);
    else setActual(res.value);
  }

  const inputId = `${seed}-prediction`;

  return (
    <FormatCard testId={testId} title="Predict the output" subtitle="Guess first, then run it. Your guess is what you learn from." done={locked}>
      <CodeBlock code={task.code} testId={`${testId}-code`} />
      <p className="font-medium text-white">
        <InlineCode text={task.question} />
      </p>

      {!locked && choices && (
        <div role="radiogroup" aria-label="Your prediction" className="space-y-1.5">
          {shuffledOrder(choices.length, seed).map((ci) => (
            <button
              key={ci}
              role="radio"
              aria-checked={choice === ci}
              data-testid={`${testId}-choice-${ci}`}
              onClick={() => setChoice(ci)}
              className={`block w-full min-w-0 rounded-lg border px-3 py-2 text-left transition ${
                choice === ci ? "border-cyan-300 bg-cyan-500/20 text-white" : "border-slate-700 text-slate-200 hover:border-cyan-400/60 hover:bg-slate-800"
              }`}
            >
              <pre className="overflow-x-auto font-mono text-xs whitespace-pre">{choices[ci]}</pre>
            </button>
          ))}
        </div>
      )}
      {!locked && !choices && (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-xs text-slate-400">
            Type exactly what you think it prints{multiLine ? " (one line per print)" : ""}
          </label>
          <textarea
            id={inputId}
            data-testid={`${testId}-input`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.max(2, task.answer.split("\n").length)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      )}
      {!locked && (
        <button data-testid={`${testId}-lock`} onClick={lockIn} disabled={!draft.trim()} className={`w-full ${primaryButton}`}>
          Lock in my prediction
        </button>
      )}

      {locked && (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <CodeBlock code={record?.prediction ?? ""} label="Your prediction" testId={`${testId}-prediction`} />
            {actual ? (
              <CodeBlock
                code={actual.stdout.replace(/\n$/, "") + (actual.error ? `\n${actual.error}` : "")}
                label="Python printed"
                testId={`${testId}-actual`}
              />
            ) : (
              <div className="flex items-end">
                <button data-testid={`${testId}-run`} onClick={runIt} disabled={running} className={`w-full ${primaryButton}`}>
                  {running ? "Running… (Python may take a few seconds to start)" : "▶ Run it"}
                </button>
              </div>
            )}
          </div>
          {runError && <Note tone="warn" title="Python couldn't run it">{runError}</Note>}
          {actual && (
            <Note
              testId={`${testId}-verdict`}
              tone={record?.correct ? "good" : "neutral"}
              title={record?.correct ? `Spot on. +${PREDICT_XP} XP` : "Not quite: compare them line by line"}
            >
              <InlineCode text={task.explain} />
            </Note>
          )}
        </>
      )}
    </FormatCard>
  );
}
