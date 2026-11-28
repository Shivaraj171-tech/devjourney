"use client";
import { hitlScore } from "@/lib/game/byte";
import { FICTIONAL_NOTE, leaderboard, rankFor } from "@/lib/game/rules";
import { ticketsAwayText } from "@/lib/game/share";
import HumanInTheLoop from "./HumanInTheLoop";
import { boardName } from "./boardName";
import { useIsClient } from "@/lib/useIsClient";
import { totalXp, useProgress } from "@/lib/progress/store";
import NameTag from "./icons/NameTag";

export default function Leaderboard() {
  const progress = useProgress();
  const xp = totalXp(progress);
  const board = useIsClient() ? leaderboard({ name: progress.playerName, xp }, progress.activeDays.length) : [];

  const myIndex = board.findIndex((b) => b.isYou);
  const above = myIndex > 0 ? board[myIndex - 1] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ink">Office leaderboard</h1>
      <p className="mt-2 text-slate-300">Everyone at Orbit Orders earns XP by shipping tickets.</p>
      {/* Honest up front, not in the last line (audit flaw 12). */}
      <p data-testid="fictional-note" className="mt-3 max-w-prose text-sm text-slate-200">
        <b className="text-ink">Practice board.</b> {FICTIONAL_NOTE} Real leaderboards come once accounts exist.
      </p>
      {above && (
        <p className="mt-4 text-[15px] text-ink">
          You&apos;re <b>{above.xp - xp + 1} XP</b> away from passing {boardName(above, progress.playerName)}. {ticketsAwayText(above.xp - xp + 1)}
        </p>
      )}
      {/* The board as a staff rota: rows on rules, place numbers, name tags. No medals. */}
      <ol className="mt-6 divide-y divide-rule border-y border-rule" data-testid="leaderboard">
        {board.map((p, i) => {
          const r = rankFor(p.xp).rank;
          return (
            <li
              key={p.name + p.role}
              className={`flex items-center gap-3 px-2 py-3 sm:gap-4 sm:px-3 ${p.isYou ? "bg-panel" : ""}`}
            >
              <span className={`w-6 text-right font-display tabular-nums ${i < 3 ? "text-xl font-bold text-ink" : "text-base text-slate-300"}`}>{i + 1}</span>
              <NameTag name={boardName(p, progress.playerName)} byte={p.byte} you={p.isYou} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink" data-you={p.isYou || undefined} data-testid="board-name">
                  {boardName(p, progress.playerName)}
                </div>
                <div className="text-sm text-slate-300">
                  {p.isYou ? "New hire" : p.role}, {r.title}
                </div>
              </div>
              <span className="text-lg font-semibold text-ink tabular-nums">{p.xp} XP</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6">
        <HumanInTheLoop score={hitlScore(Object.values(progress.tickets))} />
        <p className="mt-2 text-sm text-slate-300">
          Byte has plenty of XP, but it can&apos;t check its own work. XP says how much you&apos;ve shipped; this score says how
          well you catch an AI&apos;s mistakes.
        </p>
      </div>
    </div>
  );
}
