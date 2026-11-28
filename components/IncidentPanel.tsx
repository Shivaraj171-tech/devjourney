"use client";
// Incident tickets: a red "production is down" banner with a countdown and the
// production logs. The timer only decides a speed bonus; it never blocks you.
import { useEffect, useRef, useState } from "react";
import type { Incident } from "@/lib/content/types";
import { incidentSecondsLeft, INCIDENT_SPEED_BONUS } from "@/lib/game/rules";
import { incidentActions, type TicketProgress } from "@/lib/progress/store";
import Icon from "@/components/icons/Icon";

type Props = {
  ticketId: string;
  incident: Incident;
  tp: TicketProgress;
  /** Phone: start with the logs folded so the banner and the goal both fit the first screen. */
  logsOpenAtStart?: boolean;
  /** Desktop: the logs are a tab of the results pane under the editor, so the banner carries
   *  only the clock (the editor keeps its height; audit flaw 3). */
  withLogs?: boolean;
};

function clock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Colour a log line by how bad it looks. */
function logTone(line: string): string {
  if (/\b(ERROR|CRITICAL)\b|Traceback|^\w*Error\b|Exception/.test(line)) return "text-red-300";
  if (/\bWARN(ING)?\b/.test(line)) return "text-amber-300";
  if (/^\s+File "/.test(line)) return "text-red-200/80";
  return "text-slate-400";
}

export default function IncidentPanel({ ticketId, incident, tp, logsOpenAtStart = true, withLogs = true }: Props) {
  // Start the clock the first time the ticket is opened; the start time is saved in progress.
  useEffect(() => incidentActions.start(ticketId), [ticketId]);

  // `now` only shows once the saved start time has loaded (browser only), so server and browser HTML match.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (tp.solved) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [tp.solved]);

  const [showLogs, setShowLogs] = useState(logsOpenAtStart);
  const started = tp.incidentStartedAt ? new Date(tp.incidentStartedAt).getTime() : null;
  const limit = incident.timeLimitMinutes;

  let status: React.ReactNode = "Starting the clock…";
  if (started !== null && tp.solved && tp.solvedAt) {
    const took = Math.round((new Date(tp.solvedAt).getTime() - started) / 1000);
    const inTime = took <= limit * 60;
    status = (
      <span data-testid="incident-status">
        <Icon name="check" className="mr-1" />
        Resolved in {clock(took)}
        {inTime ? `, speed bonus +${INCIDENT_SPEED_BONUS} XP` : ", no speed bonus this time"}
      </span>
    );
  } else if (started !== null) {
    const left = incidentSecondsLeft(started, now, limit);
    status =
      left > 0 ? (
        <span data-testid="incident-status">
          <Icon name="timer" className="mr-1" />
          <span className="font-mono text-lg font-bold text-white" data-testid="incident-timer">{clock(left)}</span> left for
          the +{INCIDENT_SPEED_BONUS} XP speed bonus
        </span>
      ) : (
        <span data-testid="incident-status">
          <Icon name="timer" className="mr-1" />
          <span className="font-mono font-bold">00:00</span> Speed bonus missed. No stress: fix it anyway, customers are still waiting.
        </span>
      );
  }

  const live = !tp.solved;
  return (
    <div
      data-testid="incident-panel"
      className={`overflow-hidden rounded-2xl border ${live ? "border-red-500/60 bg-red-950/40" : "border-emerald-500/40 bg-emerald-950/30"}`}
    >
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 ${live ? "bg-red-600/25" : "bg-emerald-600/15"}`}>
        <span className={`font-display font-bold ${live ? "text-red-200" : "text-emerald-200"}`}>
          {live ? (
            <>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-pulse rounded-full motion-reduce:animate-none bg-red-400 align-middle" />
              Production incident
            </>
          ) : (
            "Incident resolved"
          )}
        </span>
        <span className="text-sm text-slate-200">{status}</span>
        {withLogs && <button
          onClick={() => setShowLogs((v) => !v)}
          aria-expanded={showLogs}
          className="ml-auto min-h-8 rounded-md px-2 py-1 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
        >
          {showLogs ? "Hide logs ▲" : "Show logs ▼"}
        </button>}
      </div>
      {withLogs && showLogs && (
        <div>
          <div className="border-t border-red-500/20 px-4 pt-2 text-xs font-semibold text-slate-300">
            Production logs <span className="font-normal">(newest at the bottom)</span>
          </div>
          <IncidentLogs logs={incident.logs} />
        </div>
      )}
    </div>
  );
}

/**
 * The production logs. Opens scrolled to the end: a traceback is read from the
 * bottom up, and the error line is the last one.
 */
export function IncidentLogs({ logs, className = "max-h-80 lg:max-h-[min(14rem,24vh)]" }: { logs: string; className?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);
  return (
    <pre ref={ref} data-testid="incident-logs" tabIndex={0} aria-label="Production logs" className={`${className} overflow-auto px-4 pt-1 pb-3 font-mono text-xs leading-5`}>
      {logs.trimEnd().split("\n").map((line, i) => (
        <div key={i} className={`whitespace-pre ${logTone(line)}`}>
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

/** Phone: the logs live in the Brief step, so the Code step gets a "Logs" chip that opens them in place. */
export function LogsChip({ logs }: { logs: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-950/40 lg:hidden" data-testid="logs-chip-panel">
      <button
        type="button"
        data-testid="logs-chip"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-red-100"
      >
        <Icon name="logs" className="h-5 w-5" /> Logs
        <span className="font-normal text-red-200/80">from production</span>
        <span aria-hidden className="ml-auto text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <IncidentLogs logs={logs} className="max-h-[40dvh] border-t border-red-500/20" />}
    </div>
  );
}
