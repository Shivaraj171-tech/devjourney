"use client";
// The merge moment (docs/design/human-pass-plan.md): the order slip you worked on goes
// onto the receipt spike and gets stamped, like a finished ticket at the pass. The XP
// prints on the slip as receipt lines. No confetti, no exclamation marks. With reduced
// motion the slip is already on the spike and the stamp is already down.
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TicketType } from "@/lib/content/types";
import { QUIZ_XP_PER_CORRECT, type TicketXp } from "@/lib/game/rules";
import MergeJuice from "./MergeJuice";

type Props = {
  xp: TicketXp;
  isRead: boolean;
  /** The ticket type, for the review/incident wording. */
  variant?: TicketType;
  /** The ticket on the slip. */
  ticket?: { number: number; title: string };
  hasQuiz: boolean;
  nextTicket: { id: string; title: string } | null;
  /** Optional extra under the blurb (e.g. a Bug Bounty's "This was a ___ bug" reveal). */
  reveal?: ReactNode;
  onQuiz: () => void;
  onClose: () => void;
};

type Wording = { title: string; stamp: string; blurb: string };

const VARIANT_TEXT: Partial<Record<TicketType, Wording>> = {
  review: { title: "Review submitted", stamp: "REVIEWED", blurb: "You flagged the problems before they reached customers." },
  incident: { title: "Incident resolved", stamp: "RESOLVED", blurb: "Production is back up. Leo can answer the support queue again." },
};

export default function SolvedModal({ xp, isRead, variant, ticket, hasQuiz, nextTicket, reveal, onQuiz, onClose }: Props) {
  const text: Wording = (variant && VARIANT_TEXT[variant]) ?? (isRead
    ? { title: "Ticket closed", stamp: "CLOSED", blurb: "You read code you didn't write, and explained what it does." }
    : { title: "PR merged", stamp: "MERGED", blurb: "All checks green. It goes out with the next release." });
  // The time on the stamp: when the merge happened (the modal opens right then).
  const [time] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  // A real dialog: focus starts on the main action, Tab stays inside, Esc closes,
  // and focus goes back to where it was (usually the Run button) afterwards.
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (before?.isConnected) before.focus();
    };
  }, []);

  const next = nextTicket
    ? { href: `/ticket/${nextTicket.id}`, label: "Next ticket", skip: "Skip to the next ticket" }
    : { href: "/", label: "Back to the office", skip: "Back to the office" };

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex overflow-y-auto bg-page/90 p-4" role="dialog" aria-modal="true" aria-labelledby="solved-title" data-testid="solved-modal">
      <div className="relative m-auto w-full max-w-sm">
        <h2 id="solved-title" className="font-display text-2xl font-bold text-ink">{text.title}</h2>
        <p className="mt-1 text-slate-200">{text.blurb}</p>
        {reveal}

        {/* The spike: its point shows above the slip, the slip is pushed down onto it. */}
        <div className="relative mt-5 pt-7">
          <svg aria-hidden viewBox="0 0 12 40" className="absolute top-0 left-1/2 h-10 w-3 -translate-x-1/2 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 1.5 6.1 39" />
          </svg>
          <div className="slip spike-drop relative rounded-sm px-5" data-testid="solved-slip">
            {/* The hole the spike went through. */}
            <span aria-hidden className="absolute top-[0.55rem] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-slate-300" />
            <p
              className="stamp-press absolute top-6 right-3 rounded-sm border-2 border-current px-2 py-0.5 font-display text-sm font-black text-[#137a43]"
              data-testid="solved-stamp"
            >
              {text.stamp} {time}
            </p>
            {ticket && (
              <p className="flex items-start gap-3 pr-20 text-paper-ink">
                <span className="slip-number text-[2.5rem]">#{ticket.number}</span>
                <span className="min-w-0 pt-1 font-display leading-snug font-bold">{ticket.title}</span>
              </p>
            )}
            <div className="slip-rule mt-3" />
            <dl className="mt-3 space-y-1 font-mono text-sm text-paper-ink" aria-label="XP for this ticket">
              <Line label="Ticket" value={`+${xp.base}`} />
              {xp.hintPenalty > 0 && <Line label="Hints used" value={`−${xp.hintPenalty}`} />}
              {!!xp.falseAlarmPenalty && <Line label="False alarms" value={`−${xp.falseAlarmPenalty}`} />}
              {xp.firstRunBonus > 0 && <Line label="First-run bonus" value={`+${xp.firstRunBonus}`} />}
              {!!xp.speedBonus && <Line label="Speed bonus" value={`+${xp.speedBonus}`} />}
              <Line label="Total" value={`+${xp.total} XP`} strong />
            </dl>
            <div className="slip-rule mt-3" />
            <MergeJuice earned={xp.total} />
          </div>
        </div>

        {/* One clear next step: the quiz locks in what was just learned. */}
        <div className="mt-5 flex flex-col gap-2">
          {hasQuiz ? (
            <>
              <button
                ref={(el) => {
                  primaryRef.current = el;
                }}
                data-testid="solved-quiz"
                onClick={onQuiz}
                className="btn-signal rounded-lg py-2.5"
              >
                Lock it in: 1-minute quiz <span className="font-normal">(+{QUIZ_XP_PER_CORRECT} XP each)</span>
              </button>
              <Link href={next.href} className="py-1 text-center text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
                {next.skip}
              </Link>
            </>
          ) : (
            <Link
              ref={(el) => {
                primaryRef.current = el;
              }}
              href={next.href}
              className="btn-signal rounded-lg py-2.5 text-center"
            >
              {next.label}
            </Link>
          )}
          <button onClick={onClose} className="py-1 text-sm text-slate-300 hover:text-ink">
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}

/** A receipt line: label, dotted leader, amount. */
function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 ${strong ? "pt-1 text-base font-bold" : ""}`}>
      <dt>{label}</dt>
      <span aria-hidden className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-paper-ink/30" />
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
