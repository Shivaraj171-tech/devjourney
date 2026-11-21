"use client";
// "Put the lines in order" (a Parsons puzzle). The lines arrive shuffled, with
// Byte's wrong lines mixed in. The learner orders them with ↑/↓ buttons
// (keyboard friendly), takes out the lines that don't belong, and checks the
// program by running it in Python against the task's check.
import { useEffect, useRef, useState } from "react";
import type { ParsonsTask } from "@/lib/content/types";
import {
  moveItem,
  PARSONS_FULL_XP_CHECKS,
  parsonsRequest,
  usedDistractors,
  type FormatRecord,
  type ParsonsResult,
} from "@/lib/game/formats";
import { InlineCode } from "../ByteSuggestion";
import { FormatCard, ghostButton, Note, primaryButton, type RunFormat } from "./shared";

export type ParsonsPuzzleProps = {
  task: ParsonsTask;
  /** Unique per page, e.g. "s03-t02:parsons:0" (used for element ids). */
  seed: string;
  record?: FormatRecord;
  /** One check. `order` is the block ids used, top to bottom. */
  onAttempt: (success: boolean, order: number[]) => void;
  run: RunFormat;
  testId?: string;
};

/** `explained`: the traps' explanations show from the second failed check on (the first only names the lines). */
type Outcome = { passed: boolean; error: string | null; distractors: { text: string; explain: string }[]; explained: boolean };

/**
 * One line of code that wraps instead of being cut off (two lines can differ only
 * at their end), with a hanging indent so the wrapped part stays under the code,
 * not under the indentation. The text content is the line exactly as written.
 */
function CodeLine({ text, className = "" }: { text: string; className?: string }) {
  const indent = text.match(/^\s*/)?.[0] ?? "";
  return (
    <code className={`flex min-w-0 flex-1 font-mono text-xs ${className}`}>
      {indent && <span className="shrink-0 whitespace-pre">{indent}</span>}
      <span className="min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{text.slice(indent.length)}</span>
    </code>
  );
}

export default function ParsonsPuzzle({ task, seed, record, onAttempt, run, testId = "format-parsons" }: ParsonsPuzzleProps) {
  // Lines in the program (block ids, top to bottom). Everything starts in, in shuffled order.
  const [order, setOrder] = useState<number[]>(() => task.blocks.map((b) => b.id));
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Keep keyboard focus on the button that moved a line (it changes position).
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    if (focusKey) buttons.current.get(focusKey)?.focus();
  }, [focusKey, order]);

  const done = record?.done === true;
  const shown = done && record?.order ? record.order : order;
  const unused = task.blocks.filter((b) => !shown.includes(b.id));
  const byId = new Map(task.blocks.map((b) => [b.id, b]));
  const traps = task.blocks.filter((b) => b.explain);

  const ref = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(key, el);
    else buttons.current.delete(key);
  };

  function change(next: number[], focus: string | null) {
    setOrder(next);
    setOutcome(null);
    setFocusKey(focus);
  }

  async function check() {
    setRunning(true);
    const res = await run<ParsonsResult>(parsonsRequest(task, task.blocks, order));
    setRunning(false);
    if ("error" in res) {
      setOutcome({ passed: false, error: res.error, distractors: [], explained: false });
      return;
    }
    const traps = res.value.passed
      ? []
      : usedDistractors(task.blocks, order).map((b) => ({ text: b.text, explain: b.explain ?? "" }));
    // This check is attempt number (record.attempts + 1): explain from the second failure on.
    setOutcome({ passed: res.value.passed, error: res.value.error, distractors: traps, explained: (record?.attempts ?? 0) >= 1 });
    onAttempt(res.value.passed, order);
  }

  const lineLabel = (id: number) => (byId.get(id)?.text.trim() ?? "").slice(0, 60);

  return (
    <FormatCard testId={testId} icon="🧩" title="Put the lines in order" subtitle="Some lines are Byte's slips: take them out." done={done}>
      <p className="text-slate-200">
        <InlineCode text={task.goal} />
      </p>

      <div>
        <div className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase" id={`${seed}-program`}>
          Your program
        </div>
        <ol aria-labelledby={`${seed}-program`} className="space-y-1" data-testid={`${testId}-program`}>
          {shown.map((id, pos) => (
            <li
              key={id}
              data-testid={`${testId}-line`}
              data-block={id}
              className="flex min-w-0 flex-wrap items-center gap-1 rounded-lg border border-slate-700 bg-[#1e1e1e] py-1 pr-1 pl-2"
            >
              {/* Long lines push the buttons onto their own row on narrow screens, so the code stays readable. */}
              <span className="flex min-w-0 flex-[1_1_auto] items-baseline gap-1">
                <span className="w-5 shrink-0 text-right font-mono text-[11px] text-slate-500 select-none" aria-hidden>
                  {pos + 1}
                </span>
                <CodeLine text={byId.get(id)?.text ?? ""} className="py-1 text-slate-100" />
              </span>
              {!done && (
                <span className="ml-auto flex shrink-0 gap-1">
                  <button
                    ref={ref(`${id}:up`)}
                    onClick={() => change(moveItem(order, pos, -1), pos === 1 ? `${id}:down` : `${id}:up`)}
                    disabled={pos === 0}
                    aria-label={`Move line up: ${lineLabel(id)}`}
                    data-testid={`${testId}-up-${id}`}
                    className={`${ghostButton} px-2 py-1`}
                  >
                    ↑
                  </button>
                  <button
                    ref={ref(`${id}:down`)}
                    onClick={() => change(moveItem(order, pos, 1), pos === order.length - 2 ? `${id}:up` : `${id}:down`)}
                    disabled={pos === order.length - 1}
                    aria-label={`Move line down: ${lineLabel(id)}`}
                    data-testid={`${testId}-down-${id}`}
                    className={`${ghostButton} px-2 py-1`}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => change(order.filter((x) => x !== id), null)}
                    aria-label={`Take out line: ${lineLabel(id)}`}
                    data-testid={`${testId}-remove-${id}`}
                    className={`${ghostButton} px-2 py-1 text-red-200`}
                  >
                    ✕
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {!done && unused.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase" id={`${seed}-unused`}>
            Taken out
          </div>
          <ul aria-labelledby={`${seed}-unused`} className="space-y-1" data-testid={`${testId}-unused`}>
            {unused.map((b) => (
              <li key={b.id} className="flex min-w-0 items-center gap-1 rounded-lg border border-dashed border-slate-700 py-1 pr-1 pl-2 opacity-80">
                <CodeLine text={b.text} className="text-slate-400 line-through" />
                <button
                  onClick={() => change([...order, b.id], null)}
                  aria-label={`Put line back (at the end): ${lineLabel(b.id)}`}
                  data-testid={`${testId}-restore-${b.id}`}
                  className={`${ghostButton} shrink-0 px-2 py-1`}
                >
                  ↩ Use
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!done && (
        <button data-testid={`${testId}-check`} onClick={check} disabled={running || order.length === 0} className={`w-full ${primaryButton}`}>
          {running ? "Running your program…" : "▶ Check my program"}
        </button>
      )}

      {done && (
        <Note testId={`${testId}-success`} tone="good" title={`✓ It works! +${record?.xp ?? 0} XP`}>
          {task.explain ? <InlineCode text={task.explain} /> : "Every check passed."}
          {/* Solved: now every one of Byte's slips can explain itself. */}
          {traps.length > 0 && (
            <div className="mt-2" data-testid={`${testId}-traps`}>
              <div className="text-xs font-semibold">Byte&apos;s slips, and why they&apos;re wrong:</div>
              {traps.map((d) => (
                <div key={d.id} className="mt-1.5">
                  <CodeLine text={d.text} className="text-amber-200" />
                  <InlineCode text={d.explain ?? ""} />
                </div>
              ))}
            </div>
          )}
        </Note>
      )}
      {!done && outcome && !outcome.passed && (
        <Note testId={`${testId}-fail`} tone="warn" title="Not yet: the check failed">
          {outcome.error && <p className="font-mono text-xs break-words">{outcome.error}</p>}
          {outcome.distractors.length > 0 && (
            <p className="mt-1.5">
              {outcome.explained
                ? "These lines are Byte's slips:"
                : `${outcome.distractors.length === 1 ? "This line doesn't" : "These lines don't"} belong in the program. Can you see why? (Check again to get the explanation.)`}
            </p>
          )}
          {outcome.distractors.map((d) => (
            <div key={d.text} className="mt-1.5" data-testid={`${testId}-wrong-line`}>
              <CodeLine text={d.text} className="text-amber-200" />
              {outcome.explained && <InlineCode text={d.explain} />}
            </div>
          ))}
          {(record?.attempts ?? 0) >= PARSONS_FULL_XP_CHECKS && outcome.distractors.length === 0 && (
            <p className="mt-1.5">Read the goal again, then trace the program for one input, line by line.</p>
          )}
        </Note>
      )}
    </FormatCard>
  );
}
