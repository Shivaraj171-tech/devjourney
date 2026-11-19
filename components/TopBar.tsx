"use client";
import Link from "next/link";
import { useIsClient } from "@/lib/useIsClient";
import { currentStreak, rankFor } from "@/lib/game/rules";
import { totalXp, useProgress } from "@/lib/progress/store";

export default function TopBar() {
  const progress = useProgress();
  const xp = totalXp(progress);
  const { rank, next, progress: pct } = rankFor(xp);
  // Streak depends on today's date, so compute it only in the browser.
  const isClient = useIsClient();
  const streak = isClient ? currentStreak(progress.activeDays, new Date()) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-lg">🛰️</span>
          <span className="hidden sm:inline">Orbit Orders <span className="font-normal text-slate-400">HQ</span></span>
        </Link>
        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link href="/" className="rounded-md px-2 py-1.5 text-slate-300 sm:px-3 hover:bg-slate-800 hover:text-white">Office</Link>
          <Link href="/skills" className="rounded-md px-2 py-1.5 text-slate-300 sm:px-3 hover:bg-slate-800 hover:text-white">Skills</Link>
          <Link href="/leaderboard" className="rounded-md px-2 py-1.5 text-slate-300 sm:px-3 hover:bg-slate-800 hover:text-white">Leaderboard</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
          <span title="Daily streak" className="rounded-full bg-orange-500/10 px-2.5 py-1 font-semibold text-orange-300">
            🔥 {streak}
          </span>
          <div className="hidden min-w-48 sm:block" title={next ? `${next.minXp - xp} XP to ${next.title}` : "Max rank"}>
            <div className="flex justify-between gap-3 text-xs whitespace-nowrap">
              <span className="text-slate-300">{rank.emoji} {rank.title}</span>
              <span className="font-mono text-cyan-300" data-testid="xp-total">{xp} XP</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
          </div>
          <span className="font-mono text-cyan-300 sm:hidden">{xp} XP</span>
        </div>
      </div>
    </header>
  );
}
