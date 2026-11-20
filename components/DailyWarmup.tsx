"use client";
// Daily warm-up: a 2-minute "read this code" question. Keeps your streak alive
// on days when there's no time for a full ticket.
import { shuffledOrder } from "@/lib/game/shuffle";
import { useState } from "react";
import type { Warmup } from "@/lib/content/types";
import { dayKey, pickWarmup, WARMUP_XP } from "@/lib/game/rules";
import { actions, type Progress } from "@/lib/progress/store";

type Props = { warmups: Warmup[]; progress: Progress; solvedTicketIds: Set<string>; now: Date };

export default function DailyWarmup({ warmups, progress, solvedTicketIds, now }: Props) {
  const today = dayKey(now);
  const doneToday = progress.warmups?.[today];
  const doneIds = new Set(Object.values(progress.warmups ?? {}).map((w) => w.id));
  const warmup = doneToday
    ? (warmups.find((w) => w.id === doneToday.id) ?? null)
    : pickWarmup(warmups, solvedTicketIds, doneIds, today);
  const [picked, setPicked] = useState<number | null>(null);

  if (warmups.length === 0) return null;

  return (
    <section id="warm-up" className="scroll-mt-20 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5" data-testid="daily-warmup">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-white">☕ Daily warm-up</h2>
        <span className="text-xs text-amber-200">2 minutes · keeps your 🔥 streak · +{WARMUP_XP} XP if right first try</span>
      </div>
      {!warmup ? (
        <p className="mt-2 text-sm text-slate-400">Merge your first ticket to unlock daily warm-ups.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{warmup.title}</div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[13px] leading-snug text-slate-200">
              {warmup.code.trimEnd()}
            </pre>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-200">{warmup.question}</p>
            <div className="mt-2 space-y-1.5">
              {shuffledOrder(warmup.choices.length, warmup.id).map((i) => {
                const c = warmup.choices[i];
                const shown = doneToday ? i === warmup.answer : picked !== null && (i === picked || i === warmup.answer);
                const right = i === warmup.answer;
                return (
                  <button
                    key={i}
                    disabled={Boolean(doneToday) || picked !== null}
                    onClick={() => {
                      setPicked(i);
                      actions.answerWarmup(warmup.id, right);
                    }}
                    className={`block w-full rounded-lg border px-3 py-1.5 text-left text-sm ${
                      shown
                        ? right
                          ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                          : "border-red-400/60 bg-red-500/10 text-red-100"
                        : "border-slate-700 text-slate-200 hover:border-amber-400/60 hover:bg-slate-800 disabled:hover:border-slate-700 disabled:hover:bg-transparent"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {(doneToday || picked !== null) && (
              <p className="mt-2 text-xs text-slate-300">
                {(doneToday ? doneToday.correct : picked === warmup.answer) ? "✔ Nice! " : "Not quite. "}
                {warmup.explain} <span className="text-slate-400">Come back tomorrow for a new one.</span>
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
