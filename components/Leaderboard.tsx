"use client";
import { hitlScore } from "@/lib/game/byte";
import { FICTIONAL_NOTE, leaderboard, rankFor } from "@/lib/game/rules";
import { ticketsAwayText } from "@/lib/game/share";
import HumanInTheLoop from "./HumanInTheLoop";
import { boardName } from "./boardName";
import { useIsClient } from "@/lib/useIsClient";
import { totalXp, useProgress } from "@/lib/progress/store";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const progress = useProgress();
  const xp = totalXp(progress);
  const board = useIsClient() ? leaderboard({ name: progress.playerName, xp }, progress.activeDays.length) : [];

  const myIndex = board.findIndex((b) => b.isYou);
  const above = myIndex > 0 ? board[myIndex - 1] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-white">🏆 Office leaderboard</h1>
      <p className="mt-2 text-slate-300">Everyone at Orbit Orders earns XP by shipping tickets.</p>
      {/* Honest up front, not in the last line (audit flaw 12). */}
      <p data-testid="fictional-note" className="mt-3 rounded-xl border border-rule bg-panel px-3 py-2 text-sm text-slate-200">
        <b className="text-ink">Practice board.</b> {FICTIONAL_NOTE} Real leaderboards come once accounts exist.
      </p>
      {above && (
        <p className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-violet-100">
          You&apos;re <b>{above.xp - xp + 1} XP</b> away from passing {above.avatar} {boardName(above, progress.playerName)}. {ticketsAwayText(above.xp - xp + 1)}
        </p>
      )}
      <ol className="mt-6 space-y-2" data-testid="leaderboard">
        {board.map((p, i) => {
          const r = rankFor(p.xp).rank;
          return (
            <li
              key={p.name + p.role}
              className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${
                p.isYou ? "border-violet-400/60 bg-violet-500/15" : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <span className="w-8 text-center text-xl">{MEDALS[i] ?? <span className="text-sm text-slate-400">{i + 1}</span>}</span>
              <span className="text-3xl" aria-hidden>{p.avatar}</span>
              <div className="flex-1">
                <div className="font-semibold text-white" data-you={p.isYou || undefined} data-testid="board-name">
                  {boardName(p, progress.playerName)}
                </div>
                <div className="text-xs text-slate-400">
                  {p.isYou ? "New hire" : p.role} · {r.emoji} {r.title}
                </div>
              </div>
              <span className="font-mono text-lg text-cyan-300">{p.xp} XP</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6">
        <HumanInTheLoop score={hitlScore(Object.values(progress.tickets))} />
        <p className="mt-2 text-xs text-slate-400">
          🤖 Byte has plenty of XP, but it can&apos;t check its own work. XP says how much you&apos;ve shipped; this score says how
          well you catch an AI&apos;s mistakes.
        </p>
      </div>
    </div>
  );
}
