"use client";
// Daily warm-up: a short session of up to 3 "read this code" questions, spaced
// and mixed (lib/game/warmups.ts). Keeps your streak alive on days when there's
// no time for a full ticket.
import { shuffledOrder } from "@/lib/game/shuffle";
import { useState } from "react";
import type { Warmup } from "@/lib/content/types";
import { conceptLabel } from "@/lib/content/concepts";
import { dayKey, WARMUP_XP } from "@/lib/game/rules";
import { missSignals, nextReviewDay, planWarmups, reasonText, daysBetween, type WarmupSession } from "@/lib/game/warmups";
import { actions, warmupHistory, type Progress } from "@/lib/progress/store";
import Icon from "@/components/icons/Icon";

/**
 * Today's session for this learner. `ticketConcepts`: ticket id -> the concept it teaches.
 * `mastery` (optional, from the coding profile): concept -> 0-1; low mastery is weighted up.
 */
export function warmupSession(
  warmups: Warmup[],
  progress: Progress,
  solvedTicketIds: Set<string>,
  ticketConcepts: Record<string, string>,
  now: Date,
  mastery?: Record<string, number>,
): WarmupSession<Warmup> {
  const history = warmupHistory(progress);
  return planWarmups({
    warmups,
    solvedTicketIds,
    history,
    // Warm-up misses come from `history`; add quiz and Byte misses.
    signals: missSignals([], {}, progress.tickets, ticketConcepts),
    today: dayKey(now),
    mastery,
  });
}

type Props = {
  warmups: Warmup[];
  progress: Progress;
  solvedTicketIds: Set<string>;
  ticketConcepts: Record<string, string>;
  now: Date;
  /** From the coding profile (see warmupSession). */
  mastery?: Record<string, number>;
};

export default function DailyWarmup({ warmups, progress, solvedTicketIds, ticketConcepts, now, mastery }: Props) {
  const session = warmupSession(warmups, progress, solvedTicketIds, ticketConcepts, now, mastery);
  // The item being looked at after answering it (its feedback stays until "Next").
  const [viewing, setViewing] = useState<string | null>(null);
  // Choice picked in this visit, per warm-up (to highlight a wrong pick).
  const [picked, setPicked] = useState<Record<string, number>>({});

  if (warmups.length === 0) return null;
  const { items } = session;
  const firstOpen = items.findIndex((i) => !i.answer);
  const viewIndex = viewing ? items.findIndex((i) => i.warmup.id === viewing) : firstOpen;
  const showDone = session.done && viewIndex === -1;
  const current = viewIndex >= 0 ? items[viewIndex] : null;

  return (
    <section id="warm-up" className="scroll-mt-20 rounded-lg border border-rule bg-panel p-5" data-testid="daily-warmup">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-white">
          <Icon name="mug" className="mr-2 h-5 w-5 text-slate-300" />
          Daily warm-up
        </h2>
        <span className="text-sm text-slate-300">
          {items.length > 1 ? `${items.length} quick questions` : "2 minutes"}. Keeps your streak going, +{WARMUP_XP} XP each if right first try.
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Merge your first ticket to unlock daily warm-ups.</p>
      ) : showDone ? (
        <WarmupDone session={session} history={warmupHistory(progress)} />
      ) : current ? (
        <>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs font-semibold text-amber-100" data-testid="warmup-progress">
              {viewIndex + 1} of {items.length}
            </span>
            <ol className="flex gap-1" aria-hidden>
              {items.map((it, i) => (
                <li
                  key={it.warmup.id}
                  className={`h-1.5 w-6 rounded-full ${
                    it.answer ? (it.answer.correct ? "bg-emerald-400" : "bg-red-400") : i === viewIndex ? "bg-amber-300" : "bg-slate-700"
                  }`}
                />
              ))}
            </ol>
          </div>
          <WarmupQuestion
            key={current.warmup.id}
            warmup={current.warmup}
            reason={reasonText(current.reason, conceptLabel)}
            answer={current.answer}
            picked={picked[current.warmup.id]}
            last={items.every((it) => it === current || it.answer)}
            onPick={(choice) => {
              setPicked((m) => ({ ...m, [current.warmup.id]: choice }));
              setViewing(current.warmup.id);
              actions.answerWarmup(current.warmup.id, choice === current.warmup.answer);
            }}
            onNext={() => setViewing(null)}
          />
        </>
      ) : null}
    </section>
  );
}

function WarmupQuestion({
  warmup,
  reason,
  answer,
  picked,
  last,
  onPick,
  onNext,
}: {
  warmup: Warmup;
  reason: string;
  answer?: { correct: boolean };
  picked?: number;
  last: boolean;
  onPick: (choice: number) => void;
  onNext: () => void;
}) {
  const answered = !!answer;
  return (
    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="warmup-item" data-warmup-id={warmup.id}>
      <div className="min-w-0">
        <p className="text-xs text-amber-200/90" data-testid="warmup-reason">{reason}</p>
        <div className="mt-1 text-sm font-semibold text-white">{warmup.title}</div>
        <pre tabIndex={0} className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[13px] leading-snug text-slate-200">
          {warmup.code.trimEnd()}
        </pre>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-200">{warmup.question}</p>
        <div className="mt-2 space-y-1.5">
          {shuffledOrder(warmup.choices.length, warmup.id).map((i) => {
            const right = i === warmup.answer;
            const shown = answered && (right || i === picked);
            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => onPick(i)}
                className={`block w-full rounded-lg border px-3 py-1.5 text-left text-sm ${
                  shown
                    ? right
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                      : "border-red-400/60 bg-red-500/10 text-red-100"
                    : "border-slate-700 text-slate-200 hover:border-amber-400/60 hover:bg-slate-800 disabled:hover:border-slate-700 disabled:hover:bg-transparent"
                }`}
              >
                {warmup.choices[i]}
              </button>
            );
          })}
        </div>
        {answer && (
          <>
            <p className="mt-2 text-xs text-slate-300" data-testid="warmup-feedback">
              {answer.correct ? `Right. +${WARMUP_XP} XP. ` : "Not quite. It'll come back for review tomorrow. "}
              {warmup.explain}
            </p>
            <button
              data-testid="warmup-next"
              onClick={onNext}
              className="mt-3 rounded-lg border border-slate-500 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-800"
            >
              {last ? "Finish warm-up" : "Next question"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WarmupDone({ session, history }: { session: WarmupSession<Warmup>; history: ReturnType<typeof warmupHistory> }) {
  const next = nextReviewDay(history, session.day);
  const inDays = next ? daysBetween(session.day, next) : null;
  return (
    <div className="mt-3" data-testid="warmup-done">
      <p className="text-sm font-semibold text-emerald-200">
        Warm-up done: {session.correctFirstTry} of {session.items.length} right first try
        {session.correctFirstTry > 0 && ` (+${session.correctFirstTry * WARMUP_XP} XP)`}. Your streak is safe today.
      </p>
      <ul className="mt-2 space-y-1">
        {session.items.map((it) => (
          <li key={it.warmup.id} className="flex gap-2 text-xs text-slate-300">
            <span role="img" aria-label={it.answer?.correct ? "right" : "missed"} className={it.answer?.correct ? "text-pass" : "text-fail"}>
              <Icon name={it.answer?.correct ? "check" : "cross"} />
            </span>
            <span className="min-w-0">
              <span className="text-slate-100">{it.warmup.title}</span>, {conceptLabel(it.warmup.concept)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">
        {inDays === 1 ? "Next review: tomorrow." : inDays ? `Next review in ${inDays} days.` : "Come back tomorrow."} Misses come back
        sooner, the ones you know come back later.
      </p>
    </div>
  );
}
