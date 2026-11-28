"use client";
// "Break Byte's code": Byte says its function works. The learner types an input,
// Python runs Byte's function on it and then the spec check. The learner wins
// when the spec check FAILS: they found a counterexample. No solution ships.
import { useState, type FormEvent } from "react";
import type { BreakItTask } from "@/lib/content/types";
import {
  BREAK_IT_XP,
  breakItFeedback,
  breakItRequest,
  callPreview,
  type BreakItResult,
  type FormatRecord,
} from "@/lib/game/formats";
import { InlineCode } from "../ByteSuggestion";
import { CodeBlock, FormatCard, Note, primaryButton, type RunFormat } from "./shared";
import Icon from "@/components/icons/Icon";

export type BreakBytesCodeProps = {
  task: BreakItTask;
  /** Unique per page, e.g. "s01-t09:break_it:0" (used for element ids). */
  seed: string;
  record?: FormatRecord;
  /** One checked input. `success`: it broke Byte's code. Not called for invalid inputs. */
  onAttempt: (success: boolean, input: string) => void;
  run: RunFormat;
  testId?: string;
};

type Tried = { input: string; tone: "good" | "neutral" | "warn"; text: string };

export default function BreakBytesCode({ task, seed, record, onAttempt, run, testId = "format-break-it" }: BreakBytesCodeProps) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [tried, setTried] = useState<Tried[]>([]);

  const done = record?.done === true;
  const inputId = `${seed}-input`;

  async function tryIt(e: FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || running) return;
    setRunning(true);
    const res = await run<BreakItResult>(breakItRequest(task, value));
    setRunning(false);
    if ("error" in res) {
      setTried((t) => [{ input: value, tone: "warn", text: res.error }, ...t]);
      return;
    }
    const feedback = breakItFeedback(res.value, task.miss);
    setTried((t) => [{ input: value, ...feedback }, ...t]);
    if (res.value.status === "broken" || res.value.status === "holds") onAttempt(res.value.status === "broken", value);
  }

  return (
    <FormatCard testId={testId} title="Break Byte's code" subtitle="Find ONE input where Byte's code breaks the spec." done={done}>
      <p className="rounded-lg border border-violet-400/40 bg-violet-500/10 p-2 text-violet-50">
        <Icon name="byte" className="mr-1 text-byte" />
          <span aria-hidden>“</span>
        <InlineCode text={task.says} />
        <span aria-hidden>”</span>
      </p>
      <CodeBlock code={task.code} label="Byte's code" testId={`${testId}-code`} />
      <p className="text-xs text-slate-400">
        Byte&apos;s own test: <code className="font-mono text-slate-200">{callPreview(task.call, task.normalInput)}</code> meets the spec.
      </p>
      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-2.5">
        <div className="text-xs font-semibold text-slate-300">The spec</div>
        <p className="mt-1 text-slate-200">
          <InlineCode text={task.spec} />
        </p>
      </div>

      {!done && (
        <form onSubmit={tryIt} className="space-y-1.5">
          <label htmlFor={inputId} className="block text-xs text-slate-400">
            Your input: <InlineCode text={task.inputHint} />
          </label>
          <div className="flex min-w-0 items-center gap-1 font-mono text-xs">
            <span className="shrink-0 text-slate-400">{task.call.split("{input}")[0]}</span>
            <input
              id={inputId}
              data-testid={`${testId}-input`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <span className="shrink-0 text-slate-400">{task.call.split("{input}")[1] ?? ""}</span>
          </div>
          <button type="submit" data-testid={`${testId}-try`} disabled={!input.trim() || running} className={`w-full ${primaryButton}`}>
            {running ? "Running Byte's code…" : "Try to break it"}
          </button>
        </form>
      )}

      {done && (
        <Note testId={`${testId}-success`} tone="good" title={`You broke it. +${BREAK_IT_XP} XP`}>
          {record?.input && (
            <p className="mb-1 font-mono text-xs">
              {callPreview(task.call, record.input)}
            </p>
          )}
          <InlineCode text={task.explain} />
        </Note>
      )}

      {tried.length > 0 && (
        <ul className="space-y-1.5" aria-label="Inputs you tried" data-testid={`${testId}-tries`}>
          {tried.map((t, i) => (
            <li key={tried.length - i} className="min-w-0">
              <Note tone={t.tone}>
                <span className="block overflow-x-auto font-mono text-xs whitespace-pre">{callPreview(task.call, t.input)}</span>
                <InlineCode text={t.text} />
              </Note>
            </li>
          ))}
        </ul>
      )}
    </FormatCard>
  );
}
