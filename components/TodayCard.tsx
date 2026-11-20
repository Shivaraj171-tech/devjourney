"use client";
// Returning players: what to do today, at a glance. Replaces the big pitch
// once the first ticket is merged (the pitch stays for first-time visitors).
import Link from "next/link";
import type { ReactNode } from "react";
import { rankFor, WARMUP_XP } from "@/lib/game/rules";
import { conceptLabel } from "@/lib/content/concepts";
import { TICKET_TYPE } from "./FloorBoard";
import type { TicketSummary } from "./HQ";

type Props = {
  playerName: string;
  next: TicketSummary | undefined;
  nextFloor: number;
  merged: number;
  total: number;
  streak: number;
  warmup: "ready" | "done" | "none";
  xp: number;
};

export default function TodayCard({ playerName, next, nextFloor, merged, total, streak, warmup, xp }: Props) {
  const { rank, next: nextRank, progress } = rankFor(xp);
  const name = playerName === "You" ? "dev" : playerName;
  const type = next ? TICKET_TYPE[next.type] : null;

  return (
    <section
      data-testid="today-card"
      aria-labelledby="today-title"
      className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950 via-slate-900 to-cyan-950 p-5 sm:p-6"
    >
      <p className="text-sm font-semibold tracking-widest text-cyan-300 uppercase">Today · Welcome back, {name}</p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {next && type ? (
            <>
              <h1 id="today-title" className="text-2xl leading-tight font-bold text-white sm:text-3xl">
                <span className="text-violet-200">#{next.number}</span> {next.title}
              </h1>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-300">
                <span>
                  <span aria-hidden>{type.icon}</span> {type.label}
                </span>
                <span>~{next.estimatedMinutes} min</span>
                <span>New idea: {conceptLabel(next.newConcept)}</span>
                <span>Floor {nextFloor}</span>
              </p>
            </>
          ) : (
            <h1 id="today-title" className="text-2xl font-bold text-white sm:text-3xl">
              🏆 Every floor is done. More seasons are coming soon.
            </h1>
          )}
        </div>
        {next && (
          <Link
            href={`/ticket/${next.id}`}
            data-testid="continue"
            className="shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
          >
            {merged === 0 ? "Start ticket →" : "Continue →"}
          </Link>
        )}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" aria-label="Your day">
        <Tile label="Streak" testId="today-streak">
          <span aria-hidden>🔥</span> {streak > 0 ? `${streak}-day streak` : "Start one today"}
        </Tile>
        <Tile label="Warm-up" testId="today-warmup">
          {warmup === "ready" ? (
            <a href="#warm-up" className="text-amber-200 underline-offset-2 hover:underline">
              ☕ Ready · +{WARMUP_XP} XP
            </a>
          ) : warmup === "done" ? (
            <>☕ Done for today ✓</>
          ) : (
            <span className="text-slate-300">☕ Unlocks soon</span>
          )}
        </Tile>
        <Tile label="Rank" testId="today-rank">
          {nextRank ? (
            <>
              {nextRank.minXp - xp} XP to {nextRank.emoji} {nextRank.title}
              <span
                className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label={`Progress to ${nextRank.title}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
            </>
          ) : (
            <>
              {rank.emoji} {rank.title} · max rank
            </>
          )}
        </Tile>
        <Tile label="Merged" testId="today-merged">
          {merged}/{total} tickets
        </Tile>
      </ul>
    </section>
  );
}

function Tile({ label, testId, children }: { label: string; testId: string; children: ReactNode }) {
  return (
    <li className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-2.5" data-testid={testId}>
      <div className="text-[11px] font-semibold tracking-wide text-slate-300 uppercase">{label}</div>
      <div className="mt-0.5 font-semibold text-white">{children}</div>
    </li>
  );
}
