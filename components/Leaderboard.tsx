"use client";
import { useEffect, useState } from "react";
import { leaderboard, rankFor, type Teammate } from "@/lib/game/rules";
import { daysSinceStart, totalXp, useProgress } from "@/lib/progress/store";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const progress = useProgress();
  const xp = totalXp(progress);
  const [board, setBoard] = useState<Teammate[]>([]);
  useEffect(() => {
    setBoard(leaderboard({ name: progress.playerName, xp }, daysSinceStart(progress, new Date())));
  }, [progress, xp]);

  const myIndex = board.findIndex((b) => b.isYou);
  const above = myIndex > 0 ? board[myIndex - 1] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-white">🏆 Office leaderboard</h1>
      <p className="mt-2 text-slate-400">
        Everyone at Orbit Orders earns XP by shipping. Sam, the other new hire, learns a bit every day, so keep your streak going!
      </p>
      {above && (
        <p className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-violet-100">
          You're <b>{above.xp - xp + 1} XP</b> away from passing {above.avatar} {above.name}. That's about one ticket!
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
              <span className="w-8 text-center text-xl">{MEDALS[i] ?? <span className="text-sm text-slate-500">{i + 1}</span>}</span>
              <span className="text-3xl">{p.avatar}</span>
              <div className="flex-1">
                <div className="font-semibold text-white">{p.isYou ? `${progress.playerName} (you)` : p.name}</div>
                <div className="text-xs text-slate-400">
                  {p.role} · {r.emoji} {r.title}
                </div>
              </div>
              <span className="font-mono text-lg text-cyan-300">{p.xp} XP</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-slate-500">
        Your teammates are fictional for now. Real multiplayer leaderboards are planned once accounts exist.
      </p>
    </div>
  );
}
