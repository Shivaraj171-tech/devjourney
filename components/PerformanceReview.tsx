"use client";
// End-of-season performance review from Maya: what you shipped, what you
// learned, how you handled Byte, your strengths and one thing to try next.
// Built only from saved progress (lib/game/juice.ts performanceReview).
import Link from "next/link";
import { currentSiteUrl } from "@/lib/basePath";
import { conceptLabel } from "@/lib/content/concepts";
import { hitlScore } from "@/lib/game/byte";
import { performanceReview, typeCount, type ReviewTicket } from "@/lib/game/juice";
import { rankFor } from "@/lib/game/rules";
import { ticketProgress, totalXp, useProgress } from "@/lib/progress/store";
import { useIsClient } from "@/lib/useIsClient";
import type { TicketType } from "@/lib/content/types";
import ShareButton from "./ShareButton";

type Props = {
  floor: number;
  season: { id: string; title: string };
  tickets: ReviewTicket[];
  next: { title: string; firstTicketId: string | null } | null;
};

const TYPE_ORDER: TicketType[] = ["bug", "feature", "read", "review", "incident"];

export default function PerformanceReviewView({ floor, season, tickets, next }: Props) {
  const progress = useProgress();
  const isClient = useIsClient();
  if (!isClient) return <div className="p-8 text-center text-slate-400">Opening your review…</div>;

  const byId = Object.fromEntries(tickets.map((t) => [t.id, progress.tickets[t.id] ? ticketProgress(progress, t.id) : undefined]));
  const hitl = hitlScore(tickets.flatMap((t) => (byId[t.id] ? [byId[t.id]!] : [])));
  const r = performanceReview(tickets, byId, hitl);
  const name = progress.playerName === "You" ? "our newest developer" : progress.playerName;
  const { rank } = rankFor(totalXp(progress));

  const learned = r.learned.map(conceptLabel);
  const bugsSeen = hitl.caught + hitl.wavedThrough;
  const shareText = () =>
    (bugsSeen > 0 ? `I caught ${hitl.caught} of ${bugsSeen} of Byte's AI bugs on DevJourney 🤖🪤 ` : "") +
    `My Orbit Orders review for "${season.title}": ${r.rating.emoji} ${r.rating.title}. ` +
    `${r.merged}/${r.total} tickets, ${r.clean} clean merges. Learned: ${learned.join(", ")}. ${currentSiteUrl()}`;

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid="performance-review" data-complete={r.complete}>
      <header className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-950/60 via-slate-900 to-violet-950/60 p-6">
        <p className="text-sm font-semibold tracking-widest text-amber-300 uppercase">
          📋 {r.complete ? "Performance review" : "Mid-season check-in"} · Floor {floor}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{season.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          From: Maya (Tech Lead) · To: {progress.playerName === "You" ? "you" : progress.playerName} · {rank.emoji} {rank.title}
        </p>
        <div className="pop-in mt-5 inline-flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-amber-400/10 px-4 py-3" data-testid="review-rating">
          <span className="text-4xl" aria-hidden>{r.rating.emoji}</span>
          <div>
            <div className="text-xs tracking-wide text-amber-200/80 uppercase">Overall</div>
            <div className="text-xl font-bold text-white">{r.rating.title}</div>
          </div>
        </div>
        {!r.complete && (
          <p className="mt-4 text-sm text-slate-300">
            You&apos;ve merged {r.merged} of {r.total} tickets on this floor. The full review lands when the floor is done.
          </p>
        )}
      </header>

      <section aria-label="Season stats" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Tickets merged" value={`${r.merged}/${r.total}`} testId="review-merged" />
        <Tile label="Clean merges" value={String(r.clean)} hint="first try, no hints" testId="review-clean" />
        <Tile label="Perfect quizzes" value={`${r.quizzesPerfect}/${r.quizzes}`} />
        <Tile label="XP earned" value={String(r.xp)} />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-bold text-white">🚢 What you shipped</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {TYPE_ORDER.filter((t) => r.byType[t]).map((t) => (
            <li key={t} className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">{typeCount(t, r.byType[t]!)}</li>
          ))}
          {r.merged === 0 && <li className="text-slate-400">Nothing yet. Your first ticket is waiting.</li>}
        </ul>
        <h2 className="mt-5 text-lg font-bold text-white">🧠 What you learned</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm" data-testid="review-learned">
          {learned.map((c, i) => (
            <li key={`${i}-${c}`} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">{c}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-5" data-testid="review-hitl">
        <h2 className="text-lg font-bold text-white">🤖 You and Byte this season</h2>
        {hitl.caught + hitl.wavedThrough + hitl.trusted + hitl.doubted + hitl.promptsTried === 0 ? (
          <p className="mt-1 text-sm text-slate-400">Byte stayed quiet on this floor. It won&apos;t next time.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Mini label="Bugs caught" value={`${hitl.caught}/${hitl.caught + hitl.wavedThrough}`} />
            <Mini label="Waved through" value={String(hitl.wavedThrough)} />
            <Mini label="Trusted correctly" value={`${hitl.trusted}/${hitl.trusted + hitl.doubted}`} />
            <Mini label="Best prompts" value={`${hitl.bestPrompts}/${hitl.promptsTried}`} />
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
        <h2 className="text-lg font-bold text-white">🌱 Strengths</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-200" data-testid="review-strengths">
          {r.strengths.map((s) => (
            <li key={s} className="flex gap-2"><span aria-hidden>✅</span><span>{s}</span></li>
          ))}
        </ul>
        {r.nextStep && (
          <p className="mt-4 rounded-xl bg-slate-950/50 p-3 text-sm text-slate-200" data-testid="review-next-step">
            <b className="text-white">🎯 One thing to try next:</b> {r.nextStep}
          </p>
        )}
        <p className="mt-4 text-sm text-slate-300 italic">
          “Proud of you, {name}. Keep reading the code, keep running the checks, and keep Byte honest.” Maya
        </p>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {r.complete && next?.firstTicketId ? (
          <Link href={`/ticket/${next.firstTicketId}`} className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-400">
            Start next floor: {next.title} →
          </Link>
        ) : (
          <Link href="/" className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-400">
            Back to the office
          </Link>
        )}
        <ShareButton getText={shareText} testId="review-copy" className="w-full px-5 py-3 text-base sm:w-auto" />
      </div>
    </article>
  );
}

function Tile({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="mt-1 text-xl font-bold text-white" data-testid={testId}>{value}</div>
      {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
      <div className="text-[11px] tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="font-mono text-lg font-bold text-white">{value}</div>
    </li>
  );
}
