"use client";
// /certificate/: "Human in the loop: verified". Earned by merging every ticket of
// the final exam (Byte's Week Alone, no hints) and taking the final skills check.
// Built only from saved progress. Printable (the browser's print / save as PDF);
// no file download, since some browsers block those.
import Link from "next/link";
import { useState } from "react";
import ShareButton from "./ShareButton";
import { TICKET_TYPE } from "./FloorBoard";
import { currentSiteUrl } from "@/lib/basePath";
import type { TicketType } from "@/lib/content/types";
import { hitlScore } from "@/lib/game/byte";
import { certificateDate, certificateShareText, certificateStatus, comparisonText } from "@/lib/game/skillsCheck";
import { actions, ticketProgress, useProgress } from "@/lib/progress/store";
import { useIsClient } from "@/lib/useIsClient";

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
        <div className="text-5xl" aria-hidden>🎓</div>
        <h1 className="mt-4 text-2xl font-bold text-white">Your certificate isn&apos;t ready yet</h1>
        <p className="mt-2 text-slate-300">Finish the final exam, {examTitle}, and the final skills check. Still to do:</p>
        <ul className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-sm text-slate-200">
          {status.missing.map((m) => (
            <li key={m} className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
              <span aria-hidden>⬜</span>
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
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-10">
      <article
        data-testid="certificate"
        className="relative overflow-hidden rounded-3xl border-4 border-double border-amber-300/70 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 text-center sm:p-10 print:border-slate-800 print:bg-none print:text-black"
      >
        <p className="text-xs font-semibold tracking-[0.3em] text-amber-200 uppercase print:text-slate-700">Orbit Orders · DevJourney</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl print:text-black">Human in the loop: verified</h1>
        <p className="mt-6 text-sm text-slate-300 print:text-slate-700">This certifies that</p>
        <p className="mt-1 text-2xl font-bold text-amber-100 sm:text-3xl print:text-black" data-testid="certificate-name">
          {named ? progress.playerName : "Your name here"}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-slate-200 print:text-slate-800">
          passed <b>{examTitle}</b>, the final exam: a codebase they had never seen, with no hints, no lessons and no AI
          suggestions. They reviewed an AI&apos;s pull request, fixed a production bug from the logs, and wrote tests
          that catch an AI&apos;s mistakes.
        </p>

        <dl className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-2 text-left text-sm sm:grid-cols-2" data-testid="certificate-scores">
          <Score label="Final exam" value={`${tps.length}/${tps.length} tickets merged, no hints`} />
          <Score label="Skills check" value={scores ?? ""} testId="certificate-skills" />
          {tps.map((t) => (
            <Score
              key={t.id}
              label={`${TICKET_TYPE[t.type].icon} ${t.title}`}
              value={
                t.type === "review"
                  ? `${t.reviewIssues}/${t.reviewIssues} problems found · ${t.tp.reviewFalseAlarms?.length ?? 0} false alarm${(t.tp.reviewFalseAlarms?.length ?? 0) === 1 ? "" : "s"}`
                  : `All checks green in ${t.tp.runs} run${t.tp.runs === 1 ? "" : "s"}`
              }
            />
          ))}
          {hitl.caught + hitl.wavedThrough > 0 && <Score label="Byte's bugs caught (all floors)" value={`${hitl.caught}/${hitl.caught + hitl.wavedThrough}`} />}
        </dl>

        <p className="mt-6 text-sm text-slate-300 print:text-slate-700" data-testid="certificate-date">
          {dateText} · Signed: Maya, Tech Lead 🛰️
        </p>
      </article>

      {!named && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 print:hidden"
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
          label="📣 Share my certificate"
          className="w-full px-5 py-3 text-base sm:w-auto"
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          🖨 Print
        </button>
        <Link href="/skills-check" className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-semibold text-slate-200 hover:bg-slate-800">
          📝 Review the skills check
        </Link>
      </div>
    </div>
  );
}

function Score({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl border border-amber-300/20 bg-slate-950/40 px-3 py-2 print:border-slate-300 print:bg-white">
      <dt className="text-[11px] tracking-wide text-amber-200/80 uppercase print:text-slate-600">{label}</dt>
      <dd className="font-semibold text-white print:text-black" data-testid={testId}>{value}</dd>
    </div>
  );
}
