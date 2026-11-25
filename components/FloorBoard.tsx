"use client";
// One office floor (= one season) as a row of the building directory. The floor
// you're working on opens into a small sprint board: Up next, Backlog, Merged.
// Long lists fold (the backlog after 4, merged tickets into one line), so the home
// screen stays short for a learner who has merged dozens of tickets (audit flaw 8).
// Rooms stay in the DOM either way (hidden), so their state (data-state) is always readable.
import Link from "next/link";
import { useState, type ReactNode } from "react";
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
  /** The floor that must be finished first (default: the one below). */
  gateFloor?: number;
  /** Extra links next to the review link (e.g. the certificate). */
  extra?: ReactNode;
  /** A side floor's name instead of "🏢 Floor N · title", e.g. "🤖 Robotics Lab". */
  label?: string;
  /** What opens the floor, instead of "Floor <gateFloor>", e.g. "Floor 1". */
  gateText?: string;
  /** data-testid prefix of its rooms instead of room-<id> (e.g. "lab-room"). */
  roomPrefix?: string;
  /** Link Maya's performance review once the floor is done (default true; side floors have none). */
  hasReview?: boolean;
  /** data-testid instead of floor-<n>. */
  testId?: string;
  /** One line on what's inside, shown on the folded row while the floor is locked. */
  preview?: string;
};

const BACKLOG_SHOWN = 4;

export default function FloorBoard({ floor, season, rooms, floorOpen, expanded, onToggle, gateFloor = floor - 1, extra, label, gateText, testId, roomPrefix, hasReview = true, preview }: Props) {
  // The final exam (season.yaml `final: true`) is shown as "Final exam", not a numbered floor.
  const exam = season.final;
  const done = rooms.filter((r) => r.state === "done");
  const next = rooms.filter((r) => r.state === "open");
  const backlog = rooms.filter((r) => r.state === "locked");
  const allDone = done.length === rooms.length;
  const boardId = `${testId ?? `floor-${floor}`}-board`;
  const gate = gateText ?? `Floor ${gateFloor}`;
  const status = allDone
    ? `✅ ${done.length}/${rooms.length} merged`
    : !floorOpen
      ? `${rooms.length} tickets · 🔒 opens after ${gate}`
      : `${done.length}/${rooms.length} merged`;
  const [moreBacklog, setMoreBacklog] = useState(false);
  const shownBacklog = moreBacklog ? backlog : backlog.slice(0, BACKLOG_SHOWN);
  const hiddenBacklog = backlog.slice(shownBacklog.length);
  // Merged rooms fold into one line unless there are only a few, or one was merged since the last visit.
  const mergedOpenAtStart = done.length <= 3 || done.some((r) => r.fresh);

  return (
    <section
      data-testid={testId ?? (exam ? "final-exam" : `floor-${floor}`)}
      data-state={floorOpen ? "open" : "locked"}
      data-expanded={expanded}
      className={expanded ? "bg-panel px-4 py-4 sm:px-5" : "px-4 py-3 sm:px-5"}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={boardId}
            className="flex min-h-10 w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-md text-left"
          >
            <span className={`font-display font-bold sm:text-lg ${floorOpen ? "text-ink" : "text-slate-200"}`}>
              <span aria-hidden className="mr-1.5 inline-block w-3 text-slate-300">{expanded ? "▾" : "▸"}</span>
              {label ?? (exam ? <>🎓 Final exam · {season.title}</> : <>🏢 Floor {floor} · {season.title}</>)}
            </span>
            <span className={`text-sm ${allDone ? "text-pass" : "text-slate-300"}`}>{status}</span>
          </button>
        </h2>
        {allDone && hasReview && (
          <Link href={`/review/${season.id}`} data-testid={`review-link-${season.id}`} className="py-1 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
            📋 Your performance review
          </Link>
        )}
        {extra}
      </div>
      {!expanded && !floorOpen && preview && <p className="mt-0.5 ml-[1.15rem] max-w-3xl text-sm text-slate-300" data-testid="floor-preview">{preview}</p>}

      <div id={boardId} hidden={!expanded}>
        <Markdown text={season.intro} className="mt-2 max-w-3xl text-sm text-slate-300" />
        {floorOpen && (
          <div
            className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label={`${label ?? `Floor ${floor}`} progress`}
            aria-valuemin={0}
            aria-valuemax={rooms.length}
            aria-valuenow={done.length}
          >
            <div className="h-full rounded-full bg-pass" style={{ width: `${(done.length / rooms.length) * 100}%` }} />
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]" data-testid="office-map">
          <Lane title="Up next">
            {next.length > 0 ? (
              <ol className="space-y-2">{next.map((r) => <RoomRow key={r.ticket.id} room={r} big exam={exam} prefix={roomPrefix} />)}</ol>
            ) : allDone ? (
              <Empty>🎉 Floor complete. Every ticket merged.</Empty>
            ) : (
              <Empty>🔒 Opens when you finish {gate}.</Empty>
            )}
          </Lane>
          <Lane title="Backlog" count={backlog.length}>
            {backlog.length === 0 ? (
              <Empty>Nothing waiting on this floor.</Empty>
            ) : (
              <>
                <ol className="space-y-1.5">
                  {backlog.map((r) => (
                    <RoomRow key={r.ticket.id} room={r} exam={exam} prefix={roomPrefix} hidden={!shownBacklog.includes(r)} />
                  ))}
                </ol>
                {(hiddenBacklog.length > 0 || moreBacklog) && backlog.length > BACKLOG_SHOWN && (
                  <button type="button" onClick={() => setMoreBacklog((v) => !v)} aria-expanded={moreBacklog} className="mt-1.5 min-h-8 text-sm font-semibold text-slate-200 underline underline-offset-4 hover:text-ink">
                    {moreBacklog ? "Show fewer" : `Show ${hiddenBacklog.length} more`}
                  </button>
                )}
              </>
            )}
          </Lane>
          <Lane title="Merged" count={done.length}>
            {done.length === 0 ? (
              <Empty>Tickets you merge land here.</Empty>
            ) : (
              <details open={mergedOpenAtStart} className="group">
                <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-slate-200 group-open:mb-1.5">
                  {done.length} merged, +{done.reduce((n, r) => n + r.xp, 0)} XP
                </summary>
                <ol className="space-y-1.5">{done.map((r) => <RoomRow key={r.ticket.id} room={r} exam={exam} prefix={roomPrefix} />)}</ol>
              </details>
            )}
          </Lane>
        </div>
      </div>
    </section>
  );
}

function Lane({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
        {title}
        {count !== undefined && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200 tabular-nums">{count}</span>}
      </h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-300">{children}</p>;
}

function RoomRow({ room, big = false, exam = false, prefix, hidden = false }: { room: Room; big?: boolean; exam?: boolean; prefix?: string; hidden?: boolean }) {
  // Exam rooms name no concept (that would be a hint).
  const idea = exam ? "No hints, no lesson" : conceptLabel(room.ticket.newConcept);
  const { ticket: t, state, fresh } = room;
  const type = TICKET_TYPE[t.type];
  const stateText = state === "done" ? "Merged" : state === "open" ? "Up next" : "Locked";

  const body = big ? (
    <div className="relative rounded-lg border-2 border-ink/80 bg-page p-4 transition-colors hover:border-signal">
      <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
        <span>
          <span aria-hidden>{type.icon}</span> {type.label}
        </span>
        <span>About {t.estimatedMinutes} min</span>
      </div>
      <div className="mt-2 font-display text-lg leading-snug font-bold text-ink">
        <span className="font-mono text-slate-300">#{t.number}</span> {t.title}
      </div>
      <div className="mt-1 text-sm text-slate-300">{exam ? idea : `New idea: ${idea}`}</div>
      <span className="mt-3 inline-block rounded-md border border-ink/70 px-3 py-1.5 text-sm font-semibold text-ink">Open ticket</span>
      <span className="sr-only"> ({stateText})</span>
    </div>
  ) : (
    <div
      className={`relative flex items-center gap-3 rounded-md px-2.5 py-2 ${
        state === "done" ? "bg-pass/10 hover:bg-pass/15" : "bg-slate-950/40"
      }`}
    >
      <span className="text-lg" aria-hidden>{type.icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm leading-snug font-semibold ${state === "done" ? "text-ink" : "text-slate-200"}`}>
          <span className="text-slate-300">#{t.number}</span> {t.title}
        </div>
        <div className="mt-0.5 text-xs text-slate-300">
          {type.label}, {idea}
          {state === "done" ? (
            <span className="text-pass">, +{room.xp} XP{room.quizWaiting ? ", quiz waiting" : ""}</span>
          ) : (
            <>, about {t.estimatedMinutes} min</>
          )}
        </div>
      </div>
      <span aria-hidden>{state === "done" ? "✅" : "🔒"}</span>
      <span className="sr-only">({stateText})</span>
    </div>
  );

  return (
    <li data-testid={`${prefix ?? (exam ? "exam-room" : "room")}-${t.id}`} data-state={state} data-fresh={fresh} className="relative" hidden={hidden}>
      {state === "locked" ? body : <Link href={`/ticket/${t.id}`} className="block rounded-lg">{body}</Link>}
      {fresh && <RoomFlourish change={fresh} />}
    </li>
  );
}

/** One-time flourish on a room that changed since the last visit: a MERGED stamp, or a door glow. */
function RoomFlourish({ change }: { change: "merged" | "unlocked" }) {
  if (change === "merged") {
    return (
      <span className="room-stamp pointer-events-none absolute top-1 right-10 rounded-md border-2 border-pass bg-page/80 px-1.5 py-0.5 text-[11px] font-black tracking-widest text-pass uppercase">
        Merged<span className="sr-only"> since your last visit</span>
      </span>
    );
  }
  return (
    <>
      <span className="room-unlocked pointer-events-none absolute inset-0 rounded-lg" aria-hidden />
      <span className="pop-in pointer-events-none absolute -top-2 right-2 rounded-full bg-signal px-2 py-0.5 text-[11px] font-bold text-signal-ink shadow-lg">
        🔓 New<span className="sr-only">: unlocked since your last visit</span>
      </span>
    </>
  );
}
