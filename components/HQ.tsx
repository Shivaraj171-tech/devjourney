"use client";
// Startup HQ: the home screen. Your office floor is the progress map: each
// ticket is a room that unlocks once the previous one is merged.
import Link from "next/link";
import { useState } from "react";
import { useIsClient } from "@/lib/useIsClient";
import AppPreview from "./AppPreview";
import Markdown from "./Markdown";
import Onboarding from "./Onboarding";
import { BADGES, currentStreak, leaderboard, rankFor, type BadgeContext } from "@/lib/game/rules";
import { daysSinceStart, ticketProgress, totalXp, useProgress, actions } from "@/lib/progress/store";
import type { TicketType } from "@/lib/content/types";

export type TicketSummary = {
  id: string;
  number: number;
  title: string;
  type: TicketType;
  newConcept: string;
  estimatedMinutes: number;
  hasQuiz: boolean;
  questionCount: number;
  seasonId: string;
};

export type SeasonSummary = { id: string; title: string; intro: string; tickets: TicketSummary[] };

const ROOM_ICON: Record<TicketType, string> = { bug: "🐛", feature: "✨", incident: "🚨", review: "🔍", read: "📖" };

export default function HQ({ seasons }: { seasons: SeasonSummary[] }) {
  const progress = useProgress();
  const xp = totalXp(progress);
  const { rank } = rankFor(xp);

  // Date-dependent values are computed after mount (static HTML has no "today").
  const now = useIsClient() ? new Date() : null;
  const streak = now ? currentStreak(progress.activeDays, now) : 0;

  const allTickets = seasons.flatMap((s) => s.tickets);
  const solved = allTickets.filter((t) => ticketProgress(progress, t.id).solved);
  const current = allTickets.find((t) => !ticketProgress(progress, t.id).solved);

  const badgeCtx: BadgeContext = {
    streak,
    seasonTicketCounts: Object.fromEntries(seasons.map((s) => [s.id, s.tickets.length])),
    solved: solved.map((t) => {
      const tp = ticketProgress(progress, t.id);
      return {
        type: t.type,
        hintsUsed: tp.hintsUsed,
        runs: tp.runs,
        seasonId: t.seasonId,
        quizPerfect: tp.quizDone && t.questionCount > 0 && tp.quizFirstTryCorrect === t.questionCount,
      };
    }),
  };

  const board = now ? leaderboard({ name: progress.playerName, xp }, daysSinceStart(progress, now)) : [];
  const myPlace = board.findIndex((b) => b.isYou) + 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {now && !progress.onboarded && solved.length === 0 && <Onboarding />}
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-950 via-slate-900 to-cyan-950 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold tracking-widest text-cyan-300 uppercase">Startup HQ · Orbit Orders</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {solved.length === 0 ? "Welcome to your first day! 👋" : `Welcome back, ${progress.playerName === "You" ? "dev" : progress.playerName}!`}
          </h1>
          <p className="mt-3 text-slate-300">
            You&apos;re the newest developer at a tiny food-delivery startup. No disconnected puzzles here: every ticket
            you close fixes or grows <b className="text-white">one real app</b>. Short tasks, real bugs, and your teammates are counting on you.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {current ? (
              <Link
                href={`/ticket/${current.id}`}
                data-testid="continue"
                className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
              >
                {solved.length === 0 ? "Start your first ticket →" : `Continue: #${current.number} ${current.title} →`}
              </Link>
            ) : (
              <span className="rounded-xl bg-emerald-500/20 px-5 py-3 font-semibold text-emerald-200">🏆 Season complete! More seasons coming soon.</span>
            )}
            <span className="text-sm text-slate-400">≈10–15 minutes per ticket</span>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-6 -bottom-8 text-[10rem] opacity-20 select-none sm:text-[12rem]">🛰️</div>
      </section>

      {/* ---------- stats ---------- */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rank" value={`${rank.emoji} ${rank.title}`} />
        <Stat label="XP" value={String(xp)} />
        <Stat label="Tickets merged" value={`${solved.length}/${allTickets.length}`} />
        <Stat label="Day streak" value={`🔥 ${streak}`} />
      </section>

      {/* ---------- office floor map ---------- */}
      {seasons.map((season) => (
        <section key={season.id} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">🏢 Floor 1 · {season.title}</h2>
            <Markdown text={season.intro} className="mt-1 max-w-3xl text-sm text-slate-400" />
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="office-map">
            {season.tickets.map((t, i) => {
              const tp = ticketProgress(progress, t.id);
              const prevSolved = i === 0 || ticketProgress(progress, season.tickets[i - 1].id).solved;
              const state = tp.solved ? "done" : prevSolved ? "open" : "locked";
              const isCurrent = current?.id === t.id;
              const body = (
                <div
                  className={`relative h-full rounded-2xl border p-3 transition ${
                    state === "done"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : state === "open"
                        ? `border-violet-400/60 bg-violet-500/10 hover:-translate-y-0.5 hover:bg-violet-500/20 ${isCurrent ? "ring-2 ring-violet-400/60 animate-[pulse_2.5s_ease-in-out_infinite]" : ""}`
                        : "border-slate-800 bg-slate-900/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Room {t.number}</span>
                    <span>{state === "done" ? "✅" : state === "locked" ? "🔒" : isCurrent ? "👉" : "🚪"}</span>
                  </div>
                  <div className="mt-2 text-2xl">{ROOM_ICON[t.type]}</div>
                  <div className="mt-1 text-sm leading-snug font-semibold text-white">{t.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-cyan-300">{t.newConcept}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">~{t.estimatedMinutes}m</span>
                  </div>
                  {state === "done" && (
                    <div className="mt-2 text-[11px] text-emerald-300">
                      +{tp.solveXp + tp.quizXp} XP{t.hasQuiz && !tp.quizDone ? " · quiz waiting" : ""}
                    </div>
                  )}
                </div>
              );
              return (
                <li key={t.id} data-testid={`room-${t.id}`} data-state={state}>
                  {state === "locked" ? body : <Link href={`/ticket/${t.id}`} className="block h-full">{body}</Link>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <div className="grid gap-6 lg:grid-cols-3">
        <AppPreview solved={new Set(solved.map((t) => t.id))} />
        {/* ---------- badges ---------- */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-bold text-white">🏅 Badges</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {BADGES.map((b) => {
              const earned = b.earned(badgeCtx);
              return (
                <li
                  key={b.id}
                  title={b.description}
                  className={`rounded-xl border p-2.5 text-center ${earned ? "border-amber-400/40 bg-amber-400/10" : "border-slate-800 opacity-50 grayscale"}`}
                >
                  <div className="text-2xl">{b.emoji}</div>
                  <div className="mt-1 text-xs font-semibold text-white">{b.title}</div>
                  <div className="text-[11px] text-slate-400">{b.description}</div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------- mini leaderboard ---------- */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">🏆 Office leaderboard</h2>
            <Link href="/leaderboard" className="text-sm text-cyan-300 hover:underline">See all →</Link>
          </div>
          {myPlace > 0 && <p className="mt-1 text-sm text-slate-400">You&apos;re #{myPlace} in the office.</p>}
          <ol className="mt-3 space-y-1.5">
            {board.slice(0, 5).map((p, i) => (
              <li key={p.name + p.role} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${p.isYou ? "bg-violet-500/20 text-white" : "bg-slate-950/50 text-slate-300"}`}>
                <span className="w-5 text-slate-500">{i + 1}</span>
                <span className="text-lg">{p.avatar}</span>
                <span className="flex-1">{p.isYou ? `${progress.playerName} (you)` : p.name}</span>
                <span className="font-mono text-cyan-300">{p.xp}</span>
              </li>
            ))}
          </ol>
          <NameEditor name={progress.playerName} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs tracking-wide text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function NameEditor({ name }: { name: string }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        actions.setName(value);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={name === "You" ? "Your name on the board" : `Rename (${name})`}
        maxLength={24}
        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white placeholder:text-slate-500"
      />
      <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Save</button>
    </form>
  );
}
