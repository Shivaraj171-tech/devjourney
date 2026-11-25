"use client";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { TicketType } from "@/lib/content/types";
import { QUIZ_XP_PER_CORRECT, type TicketXp } from "@/lib/game/rules";
import MergeJuice from "./MergeJuice";

type Props = {
  xp: TicketXp;
  isRead: boolean;
  /** The ticket type, for the review/incident wording. */
  variant?: TicketType;
  hasQuiz: boolean;
  nextTicket: { id: string; title: string } | null;
  /** Optional extra under the blurb (e.g. a Bug Bounty's "This was a ___ bug" reveal). */
  reveal?: ReactNode;
  onQuiz: () => void;
  onClose: () => void;
};

const CONFETTI = ["🎉", "✨", "🚀", "⭐", "🍕", "🎊"];

const VARIANT_TEXT: Partial<Record<TicketType, { icon: string; title: string; blurb: string }>> = {
  review: { icon: "🔍", title: "Review submitted!", blurb: "You caught the bugs before they reached customers. That's what good reviewers do." },
  incident: { icon: "🧯", title: "Incident resolved!", blurb: "Production is back up. Leo can finally answer the support queue." },
};

export default function SolvedModal({ xp, isRead, variant, hasQuiz, nextTicket, reveal, onQuiz, onClose }: Props) {
  const text = (variant && VARIANT_TEXT[variant]) ?? {
    icon: isRead ? "📖" : "🚀",
    title: isRead ? "Ticket closed!" : "PR merged!",
    blurb: isRead ? "You understood code you didn't write. That's a real superpower." : "All checks green. Customers will never know it was broken.",
  };
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
    ? { href: `/ticket/${nextTicket.id}`, label: "Next ticket →", skip: "Skip to the next ticket →" }
    : { href: "/", label: "Back to the office", skip: "Back to the office" };

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="solved-title" data-testid="solved-modal">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="confetti absolute text-2xl"
            style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.12}s` }}
          >
            {CONFETTI[i % CONFETTI.length]}
          </span>
        ))}
      </div>
      <div className="relative m-auto w-full max-w-md rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 text-center shadow-2xl shadow-emerald-500/10">
        <div className="text-5xl">{text.icon}</div>
        <h2 id="solved-title" className="mt-3 text-2xl font-bold text-white">{text.title}</h2>
        <p className="mt-1 text-slate-300">{text.blurb}</p>
        {reveal}
        <div className="mt-5 space-y-1 rounded-xl bg-slate-950/70 p-4 text-left font-mono text-sm">
          <Row label="Ticket XP" value={`+${xp.base}`} />
          {xp.hintPenalty > 0 && <Row label="Hints used" value={`−${xp.hintPenalty}`} className="text-amber-300" />}
          {!!xp.falseAlarmPenalty && <Row label="False alarms" value={`−${xp.falseAlarmPenalty}`} className="text-amber-300" />}
          {xp.firstRunBonus > 0 && <Row label="🎯 First-run bonus" value={`+${xp.firstRunBonus}`} className="text-cyan-300" />}
          {!!xp.speedBonus && <Row label="⚡ Speed bonus" value={`+${xp.speedBonus}`} className="text-cyan-300" />}
          <div className="my-1 border-t border-slate-800" />
          <Row label="Total" value={`+${xp.total} XP`} className="font-bold text-emerald-300" />
        </div>
        <MergeJuice earned={xp.total} />
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
                className="rounded-lg bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-500"
              >
                🧠 Lock it in: 1-minute quiz <span className="font-normal text-violet-100">(+{QUIZ_XP_PER_CORRECT} XP each)</span>
              </button>
              <Link href={next.href} className="py-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                {next.skip}
              </Link>
            </>
          ) : (
            <Link
              ref={(el) => {
                primaryRef.current = el;
              }}
              href={next.href}
              className="rounded-lg btn-signal py-2.5"
            >
              {next.label}
            </Link>
          )}
          <button onClick={onClose} className="py-1 text-sm text-slate-300 hover:text-white">
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className = "text-slate-300" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
