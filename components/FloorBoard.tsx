"use client";
// One office floor (= one season) as a sprint board: Merged · Up next · Backlog.
// Only the floor you're working on starts open; the others are one-line rows
// you can expand. Rooms stay in the DOM either way (hidden), so their state
// (data-state) is always readable.
import Link from "next/link";
import type { ReactNode } from "react";
import Markdown from "./Markdown";
import { conceptLabel } from "@/lib/content/concepts";
import type { TicketType } from "@/lib/content/types";
import type { SeasonSummary, TicketSummary } from "./HQ";

export const TICKET_TYPE: Record<TicketType, { icon: string; label: string }> = {
  bug: { icon: "🐛", label: "Bug fix" },
  feature: { icon: "✨", label: "Feature" },
  incident: { icon: "🚨", label: "Incident" },
  review: { icon: "🔍", label: "Code review" },
  read: { icon: "📖", label: "Read the code" },
};

export type RoomState = "done" | "open" | "locked";
export type Room = {
  ticket: TicketSummary;
  state: RoomState;
  xp: number;
  quizWaiting: boolean;
  fresh?: "merged" | "unlocked";
};

type Props = {
  floor: number;
  season: SeasonSummary;
  rooms: Room[];
  floorOpen: boolean;
  expanded: boolean;
  onToggle: () => void;
};

export default function FloorBoard({ floor, season, rooms, floorOpen, expanded, onToggle }: Props) {
  const done = rooms.filter((r) => r.state === "done");
  const next = rooms.filter((r) => r.state === "open");
  const backlog = rooms.filter((r) => r.state === "locked");
  const allDone = done.length === rooms.length;
  const boardId = `floor-${floor}-board`;
  const status = allDone
    ? `✅ ${done.length}/${rooms.length} merged`
    : !floorOpen
      ? `${rooms.length} tickets · 🔒 opens after Floor ${floor - 1}`
      : `${done.length}/${rooms.length} merged`;

  return (
    <section
      data-testid={`floor-${floor}`}
      data-state={floorOpen ? "open" : "locked"}
      data-expanded={expanded}
      className={`rounded-2xl border ${expanded ? "border-slate-700 bg-slate-900/40 p-4 sm:p-5" : "border-slate-800 bg-slate-900/30 px-4 py-3"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={boardId}
            className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg text-left"
          >
            <span className="font-bold text-white sm:text-lg">
              <span aria-hidden className="mr-1.5 inline-block w-3 text-slate-400">{expanded ? "▾" : "▸"}</span>
              🏢 Floor {floor} · {season.title}
            </span>
            <span className={`text-sm ${allDone ? "text-emerald-300" : "text-slate-300"}`}>{status}</span>
          </button>
        </h2>
        {allDone && (
          <Link href={`/review/${season.id}`} data-testid={`review-link-${season.id}`} className="text-sm font-semibold text-amber-300 hover:underline">
            📋 Your performance review →
          </Link>
        )}
      </div>

      <div id={boardId} hidden={!expanded}>
        <Markdown text={season.intro} className="mt-2 max-w-3xl text-sm text-slate-300" />
        {floorOpen && (
          <div
            className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label={`Floor ${floor} progress`}
            aria-valuemin={0}
            aria-valuemax={rooms.length}
            aria-valuenow={done.length}
          >
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(done.length / rooms.length) * 100}%` }} />
          </div>
        )}
        <div
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]"
          data-testid="office-map"
        >
          <Lane title="✅ Merged" count={done.length} className="order-3 lg:order-none">
            {done.length === 0 ? (
              <Empty>Tickets you merge land here.</Empty>
            ) : (
              <ol className="space-y-2">{done.map((r) => <RoomRow key={r.ticket.id} room={r} />)}</ol>
            )}
          </Lane>
          <Lane title="👉 Up next" className="order-1 lg:order-none">
            {next.length > 0 ? (
              <ol className="space-y-2">{next.map((r) => <RoomRow key={r.ticket.id} room={r} big />)}</ol>
            ) : allDone ? (
              <Empty>🎉 Floor complete. Every ticket merged.</Empty>
            ) : (
              <Empty>🔒 Opens when you finish Floor {floor - 1}.</Empty>
            )}
          </Lane>
          <Lane title="🔒 Backlog" count={backlog.length} className="order-2 lg:order-none">
            {backlog.length === 0 ? (
              <Empty>Nothing waiting on this floor.</Empty>
            ) : (
              <ol className="space-y-2">{backlog.map((r) => <RoomRow key={r.ticket.id} room={r} />)}</ol>
            )}
          </Lane>
        </div>
      </div>
    </section>
  );
}

function Lane({ title, count, className, children }: { title: string; count?: number; className: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-300 uppercase">
        {title}
        {count !== undefined && <span className="rounded-full bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">{count}</span>}
      </h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-700 px-3 py-4 text-center text-sm text-slate-300">{children}</p>;
}

function RoomRow({ room, big = false }: { room: Room; big?: boolean }) {
  const { ticket: t, state, fresh } = room;
  const type = TICKET_TYPE[t.type];
  const stateText = state === "done" ? "Merged" : state === "open" ? "Up next" : "Locked";

  const body = big ? (
    <div className="relative rounded-2xl border-2 border-violet-400/70 bg-violet-500/15 p-4 transition hover:bg-violet-500/25">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-violet-100 uppercase">
        <span>
          <span aria-hidden>{type.icon}</span> {type.label}
        </span>
        <span className="font-normal normal-case">~{t.estimatedMinutes} min</span>
      </div>
      <div className="mt-2 text-lg leading-snug font-bold text-white">
        <span className="text-violet-200">#{t.number}</span> {t.title}
      </div>
      <div className="mt-2 text-xs text-cyan-200">New idea: {conceptLabel(t.newConcept)}</div>
      <span className="mt-3 inline-block rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950">Open ticket →</span>
      <span className="sr-only"> ({stateText})</span>
    </div>
  ) : (
    <div
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        state === "done" ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15" : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <span className="text-xl" aria-hidden>{type.icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm leading-snug font-semibold ${state === "done" ? "text-white" : "text-slate-200"}`}>
          <span className="text-slate-300">#{t.number}</span> {t.title}
        </div>
        <div className="mt-0.5 text-xs text-slate-300">
          {type.label} · {conceptLabel(t.newConcept)}
          {state === "done" ? (
            <span className="text-emerald-300"> · +{room.xp} XP{room.quizWaiting ? " · quiz waiting" : ""}</span>
          ) : (
            <> · ~{t.estimatedMinutes}m</>
          )}
        </div>
      </div>
      <span aria-hidden>{state === "done" ? "✅" : "🔒"}</span>
      <span className="sr-only">({stateText})</span>
    </div>
  );

  return (
    <li data-testid={`room-${t.id}`} data-state={state} data-fresh={fresh} className="relative">
      {state === "locked" ? body : <Link href={`/ticket/${t.id}`} className="block rounded-xl">{body}</Link>}
      {fresh && <RoomFlourish change={fresh} />}
    </li>
  );
}

/** One-time flourish on a room that changed since the last visit: a MERGED stamp, or a door glow. */
function RoomFlourish({ change }: { change: "merged" | "unlocked" }) {
  if (change === "merged") {
    return (
      <span className="room-stamp pointer-events-none absolute top-1 right-10 rounded-md border-2 border-emerald-300 bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-black tracking-widest text-emerald-200 uppercase">
        Merged<span className="sr-only"> since your last visit</span>
      </span>
    );
  }
  return (
    <>
      <span className="room-unlocked pointer-events-none absolute inset-0 rounded-2xl" aria-hidden />
      <span className="pop-in pointer-events-none absolute -top-2 right-2 rounded-full bg-violet-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg">
        🔓 New<span className="sr-only">: unlocked since your last visit</span>
      </span>
    </>
  );
}
