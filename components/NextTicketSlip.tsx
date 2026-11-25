"use client";
// The home screen's one primary action: the next ticket as a kitchen order slip
// (docs/design/ui-redesign-plan.md). The only amber button on the page.
import Link from "next/link";
import type { ReactNode } from "react";
import { conceptLabel } from "@/lib/content/concepts";
import { TICKET_TYPE } from "./FloorBoard";
import type { TicketSummary } from "./HQ";

type Props = {
  ticket: TicketSummary;
  /** "Floor 1" or the final exam. */
  where: string;
  isExam?: boolean;
  cta: string;
  /** The ticket title as the page's h1 (returning players) or an h2 (under the pitch). */
  headingLevel: 1 | 2;
  headingId?: string;
  /** A short line above the number, e.g. "Your first ticket". */
  kicker?: ReactNode;
};

export default function NextTicketSlip({ ticket, where, isExam = false, cta, headingLevel, headingId, kicker }: Props) {
  const type = TICKET_TYPE[ticket.type];
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="slip w-full rounded-sm px-5 sm:px-6" data-testid="next-slip">
      {kicker && <p className="text-sm font-semibold text-paper-muted">{kicker}</p>}
      <H id={headingId} className="mt-1 flex items-start gap-3 text-paper-ink">
        <span className="slip-number text-[2.75rem] sm:text-[3.5rem]">#{ticket.number}</span>
        <span className="min-w-0 pt-1 font-display text-xl leading-snug font-bold sm:text-2xl">{ticket.title}</span>
      </H>
      <div className="slip-rule mt-4" />
      <ul className="mt-3 space-y-1 text-[15px] text-paper-ink" aria-label="About this ticket">
        <li>
          <span aria-hidden>{type.icon}</span> {type.label}, about {ticket.estimatedMinutes} min
        </li>
        <li>{isExam ? "🎓 Final exam: no hints, no lesson" : <>New idea: <b>{conceptLabel(ticket.newConcept)}</b></>}</li>
        <li className="text-paper-muted">{where}</li>
      </ul>
      <Link href={`/ticket/${ticket.id}`} data-testid="continue" className="btn-signal mt-5 block rounded-lg px-5 py-3.5 text-center text-lg">
        {cta}
      </Link>
    </div>
  );
}
