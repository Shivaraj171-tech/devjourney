"use client";
// "#orbit-team": a Slack-style feed on the HQ where teammates react to what
// you've shipped. Messages are a pure function of progress (lib/game/teamChat.ts).
import Link from "next/link";
import { cleanSolve, flowStreak } from "@/lib/game/juice";
import { suggestionOutcome } from "@/lib/game/byte";
import { teammates } from "@/lib/game/rules";
import { CHAT_PEOPLE, teamChat, type ChatTicket } from "@/lib/game/teamChat";
import { ticketProgress, totalXp, type Progress } from "@/lib/progress/store";
import type { SeasonSummary } from "./HQ";
import NameTag from "./icons/NameTag";

type Props = {
  seasons: SeasonSummary[];
  progress: Progress;
  streak: number;
  now: Date;
  /** Phone: only the latest messages show; the earlier ones fold into one line above them. */
  recent?: number;
};

export default function TeamChat({ seasons, progress, streak, recent }: Props) {
  const tickets: ChatTicket[] = seasons.flatMap((s) =>
    s.tickets.map((t) => ({ id: t.id, number: t.number, title: t.title, type: t.type, seasonId: s.id, seasonTitle: s.title, exam: s.final })),
  );
  const order = new Map(tickets.map((t, i) => [t.id, i]));
  const solved = tickets
    .filter((t) => ticketProgress(progress, t.id).solved)
    .sort((a, b) => {
      const sa = Date.parse(ticketProgress(progress, a.id).solvedAt ?? "") || 0;
      const sb = Date.parse(ticketProgress(progress, b.id).solvedAt ?? "") || 0;
      return sa - sb || order.get(a.id)! - order.get(b.id)!;
    });
  const last = solved[solved.length - 1];
  const lastTp = last ? ticketProgress(progress, last.id) : null;
  const season = last ? seasons.find((s) => s.id === last.seasonId) : undefined;
  const sam = teammates(progress.activeDays.length).find((t) => t.name === "Sam");

  const messages = teamChat({
    playerName: progress.playerName,
    solved,
    last: lastTp
      ? {
          hintsUsed: lastTp.hintsUsed,
          clean: cleanSolve(lastTp),
          byteOutcome: lastTp.byteSuggestion ? suggestionOutcome(lastTp.byteSuggestion, lastTp) : undefined,
        }
      : undefined,
    next: tickets.find((t) => !ticketProgress(progress, t.id).solved),
    seasonFinished: !!season && season.tickets.every((t) => ticketProgress(progress, t.id).solved),
    streak,
    flow: flowStreak(Object.values(progress.tickets)),
    xp: totalXp(progress),
    samXp: sam?.xp ?? 0,
  });

  const cut = recent !== undefined && messages.length > recent + 1 ? messages.length - recent : 0;
  const earlier = messages.slice(0, cut);
  const latest = messages.slice(cut);

  return (
    <section className="rounded-xl border border-rule bg-panel" aria-labelledby="team-chat-title" data-testid="team-chat">
      {/* No presence dot or "online" count: the team is fictional, so the header says what the channel is. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-rule px-4 py-2.5">
        <h2 id="team-chat-title" className="font-display text-base font-bold text-ink">
          #orbit-team
        </h2>
        <span className="text-xs text-slate-300">Fictional teammates, reacting to what you ship</span>
      </div>
      {earlier.length > 0 && (
        <details className="border-b border-rule px-4 py-2" data-testid="chat-earlier">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-slate-200">
            {earlier.length} earlier message{earlier.length === 1 ? "" : "s"}
          </summary>
          <ol className="space-y-3 pt-2 pb-1">{earlier.map((m, i) => message(m, i))}</ol>
        </details>
      )}
      <ol className="space-y-3 p-4">{latest.map((m, i) => message(m, i))}</ol>
    </section>
  );

  function message(m: (typeof messages)[number], i: number) {
    const who = CHAT_PEOPLE[m.from];
    return (
      <li
        key={m.id}
        className="chat-in flex gap-3 motion-reduce:animate-none"
        style={{ animationDelay: `${i * 140}ms` }}
        data-testid="chat-message"
        data-from={m.from}
        data-id={m.id}
      >
        <NameTag name={who.name} byte={m.from === "byte"} />
        <div className="min-w-0">
          <div className="text-xs">
            <b className={m.from === "byte" ? "text-byte" : "text-ink"}>{who.name}</b> <span className="text-slate-300">{who.role}</span>
          </div>
          <p className="text-sm break-words text-slate-300">{m.text}</p>
          {m.link && (
            <Link href={m.link.href} className="mt-1 inline-block py-1 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
              {m.link.label}
            </Link>
          )}
        </div>
      </li>
    );
  }
}
