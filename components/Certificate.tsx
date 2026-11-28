"use client";
// /certificate/: "Human in the loop: verified". Earned by merging every ticket of
// the final exam (Byte's Week Alone, no hints) and taking the final skills check.
// Built only from saved progress. Printable (the browser's print / save as PDF);
// no file download, since some browsers block those.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import ShareButton from "./ShareButton";
import { TICKET_TYPE } from "./FloorBoard";
import { currentSiteUrl } from "@/lib/basePath";
import type { TicketType } from "@/lib/content/types";
import { hitlScore } from "@/lib/game/byte";
import { certificateDate, certificateShareText, certificateStatus, comparisonText } from "@/lib/game/skillsCheck";
import { actions, ticketProgress, useProgress } from "@/lib/progress/store";
import { useIsClient } from "@/lib/useIsClient";
import Icon from "./icons/Icon";
import { OrbitMark } from "./TopBar";

type Props = {
  examTitle: string;
  tickets: { id: string; title: string; type: TicketType; reviewIssues: number }[];
};

export default function Certificate({ examTitle, tickets }: Props) {
  const progress = useProgress();
  const isClient = useIsClient();
  const [name, setName] = useState("");
  if (!isClient) return <div className="p-8 text-center text-slate-400">Opening your certificate…</div>;

  const sc = progress.skillsCheck;
  const tps = tickets.map((t) => ({ ...t, tp: ticketProgress(progress, t.id) }));
  const status = certificateStatus(tps.map((t) => ({ id: t.id, title: t.title, solved: t.tp.solved })), sc);

  if (!status.eligible) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="certificate-locked">
        <Icon name="stamp" className="h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-bold text-ink">Your certificate isn&apos;t ready yet</h1>
        <p className="mt-2 text-slate-300">Finish the final exam, {examTitle}, and the final skills check. Still to do:</p>
        <ul className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-sm text-slate-200">
          {status.missing.map((m) => (
            <li key={m} className="flex gap-2 rounded-md border border-rule px-3 py-2">
              <Icon name="pending" className="mt-0.5 text-slate-300" />
              {m}
            </li>
          ))}
        </ul>
        <Link href="/" className="mt-6 inline-block rounded-xl btn-signal px-5 py-3 ">
          Back to the office
        </Link>
      </div>
    );
  }

  const date = certificateDate(tps.map((t) => t.tp.solvedAt), sc);
  const dateText = date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
  const hitl = hitlScore(Object.values(progress.tickets));
  const scores = comparisonText(sc);
  const named = progress.playerName !== "You";

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6 sm:py-10">
      <div className="slip-lift">
      <article data-testid="certificate" className="slip relative rounded-sm px-6 sm:px-10 print:text-black">
        <p className="flex items-center gap-2 font-display font-bold text-paper-ink">
          <OrbitMark className="h-6 w-6" />
          Orbit Orders
        </p>
        <h1 className="mt-4 text-3xl leading-tight font-black text-paper-ink sm:text-4xl">Human in the loop: verified</h1>
        <p className="mt-5 text-sm text-paper-muted">This certifies that</p>
        <p className="mt-1 font-display text-2xl font-bold text-paper-ink sm:text-3xl" data-testid="certificate-name">
          {named ? progress.playerName : "Your name here"}
        </p>
        <p className="mt-3 text-paper-ink">
          passed <b>{examTitle}</b>, the final exam: a codebase they had never seen, with no hints, no lessons and no AI
          suggestions. They reviewed an AI&apos;s pull request, fixed a production bug from the logs, and wrote tests
          that catch an AI&apos;s mistakes.
        </p>

        <div className="slip-rule mt-6" />
        <dl className="mt-4 space-y-2.5 text-sm text-paper-ink" data-testid="certificate-scores">
          <Score label="Final exam" value={`${tps.length}/${tps.length} tickets merged, no hints`} />
          <Score label="Skills check" value={scores ?? ""} testId="certificate-skills" />
          {tps.map((t) => (
            <Score
              key={t.id}
              label={
                <>
                  <Icon name={TICKET_TYPE[t.type].icon} className="mr-1.5" />
                  {t.title}
                </>
              }
              value={
                t.type === "review"
                  ? `${t.reviewIssues}/${t.reviewIssues} problems found, ${t.tp.reviewFalseAlarms?.length ?? 0} false alarm${(t.tp.reviewFalseAlarms?.length ?? 0) === 1 ? "" : "s"}`
                  : `All checks green in ${t.tp.runs} run${t.tp.runs === 1 ? "" : "s"}`
              }
            />
          ))}
          {hitl.caught + hitl.wavedThrough > 0 && <Score label="Byte's bugs caught (all floors)" value={`${hitl.caught}/${hitl.caught + hitl.wavedThrough}`} />}
        </dl>

        <div className="slip-rule mt-4" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <p className="text-sm text-paper-muted" data-testid="certificate-date">
            {dateText}
            <br />
            Signed for Orbit Orders by Maya, tech lead (a character in DevJourney)
          </p>
          <p aria-hidden className="shrink-0 -rotate-6 rounded-sm border-2 border-current px-2 py-0.5 font-display text-sm font-black text-[#137a43]">
            VERIFIED
          </p>
        </div>
      </article>
      </div>

      {!named && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-lg border border-rule p-3 print:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            actions.setName(name);
            setName("");
          }}
        >
          <label htmlFor="certificate-name-input" className="text-sm text-slate-300">
            Name on the certificate
          </label>
          <input
            id="certificate-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white placeholder:text-slate-500"
          />
          <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Save</button>
        </form>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start print:hidden">
        <ShareButton
          getText={() => certificateShareText(progress.playerName, sc, { merged: tps.length, total: tps.length }, currentSiteUrl())}
          testId="certificate-share"
          label="Share my certificate"
          className="w-full px-5 py-3 text-base sm:w-auto"
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-ink hover:bg-slate-800"
        >
          Print
        </button>
        <Link href="/skills-check" className="rounded-lg border border-slate-600 px-5 py-3 text-center text-sm font-semibold text-ink hover:bg-slate-800">
          Review the skills check
        </Link>
      </div>
    </div>
  );
}

/** A receipt line: what was done on the left, the result on the right. */
function Score({ label, value, testId }: { label: ReactNode; value: string; testId?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-paper-muted">{label}</dt>
      <dd className="font-semibold" data-testid={testId}>{value}</dd>
    </div>
  );
}
