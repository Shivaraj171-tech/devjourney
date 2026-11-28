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
import { comparisonText, skillsShareText } from "@/lib/game/skillsCheck";
import { ticketProgress, totalXp, useProgress } from "@/lib/progress/store";
import { useIsClient } from "@/lib/useIsClient";
import type { TicketType } from "@/lib/content/types";
import ShareButton from "./ShareButton";
import Icon from "./icons/Icon";

type Props = {
  /** "Floor 3", or "Final exam" for the final season. */
  floorLabel: string;
  season: { id: string; title: string; final?: boolean };
  tickets: ReviewTicket[];
  next: { title: string; firstTicketId: string | null; final?: boolean } | null;
};

const TYPE_ORDER: TicketType[] = ["bug", "feature", "read", "review", "incident"];

export default function PerformanceReviewView({ floorLabel, season, tickets, next }: Props) {
  const progress = useProgress();
  const isClient = useIsClient();
  if (!isClient) return <div className="p-8 text-center text-slate-400">Opening your review…</div>;

  const byId = Object.fromEntries(tickets.map((t) => [t.id, progress.tickets[t.id] ? ticketProgress(progress, t.id) : undefined]));
  const hitl = hitlScore(tickets.flatMap((t) => (byId[t.id] ? [byId[t.id]!] : [])));
  const r = performanceReview(tickets, byId, hitl);
  const name = progress.playerName === "You" ? "our newest developer" : progress.playerName;
  const { rank } = rankFor(totalXp(progress));

  // The final exam teaches nothing new (it's an exam), so it lists no concepts.
  const learned = season.final ? [] : r.learned.map(conceptLabel);
  const skills = comparisonText(progress.skillsCheck);
  const bugsSeen = hitl.caught + hitl.wavedThrough;
  const shareText = () =>
    (bugsSeen > 0 ? `I caught ${hitl.caught} of ${bugsSeen} of Byte's AI bugs on DevJourney. ` : "") +
    `My Orbit Orders review for "${season.title}": ${r.rating.title}. ` +
    `${r.merged}/${r.total} tickets, ${r.clean} clean merges.` +
    (learned.length ? ` Learned: ${learned.join(", ")}.` : "") +
    (skills ? ` Skills check: ${skills}.` : "") +
    ` ${currentSiteUrl()}`;

  // A memo from Maya, set like one: who it's from, who it's to, what it's about, then the
  // numbers in sentences. No stat tiles, no gradient header, no eyebrow.
  const shipped = TYPE_ORDER.filter((t) => r.byType[t]).map((t) => typeCount(t, r.byType[t]!));
  const you = progress.playerName === "You" ? "You" : progress.playerName;
  return (
    <article className="mx-auto max-w-2xl px-4 py-8" data-testid="performance-review" data-complete={r.complete}>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">{season.title}</h1>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-[15px]">
        <dt className="text-slate-300">From</dt>
        <dd className="text-ink">Maya, tech lead</dd>
        <dt className="text-slate-300">To</dt>
        <dd className="text-ink">
          {you}, {rank.title}
        </dd>
        <dt className="text-slate-300">About</dt>
        <dd className="text-ink">
          {r.complete ? "Your performance review" : "A mid-season check-in"}, {floorLabel}
        </dd>
      </dl>

      <div className="mt-6 space-y-5 border-t border-rule pt-6 text-[15px] leading-relaxed text-slate-200">
        <p className="text-lg text-ink">
          Overall: <b data-testid="review-rating">{r.rating.title}</b>.
        </p>
        <p>
          You merged <b className="text-ink tabular-nums" data-testid="review-merged">{`${r.merged}/${r.total}`}</b> tickets on this floor, and{" "}
          <b className="text-ink tabular-nums" data-testid="review-clean">{String(r.clean)}</b> of them were clean merges (first try, no hints).
          {r.quizzes > 0 && (
            <>
              {" "}
              Quizzes right first time: {r.quizzesPerfect} of {r.quizzes}.
            </>
          )}{" "}
          XP earned here: {r.xp}.
        </p>
        {!r.complete && <p>The full review lands when the floor is done.</p>}
        <p>
          {r.merged === 0 ? (
            "Nothing shipped yet. Your first ticket is waiting."
          ) : (
            <>What you shipped: {shipped.join(", ")}.</>
          )}
        </p>
        {learned.length > 0 && (
          <div>
            <p>What you learned:</p>
            <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-ink" data-testid="review-learned">
              {learned.map((c, i) => (
                <li key={`${i}-${c}`}>
                  {c}
                  {i < learned.length - 1 ? "," : "."}
                </li>
              ))}
            </ul>
          </div>
        )}

        <section data-testid="review-hitl">
          <h2 className="text-lg font-bold text-ink">
            <Icon name="byte" className="mr-2 h-5 w-5 text-byte" />
            You and Byte this season
          </h2>
          {hitl.caught + hitl.wavedThrough + hitl.trusted + hitl.doubted + hitl.promptsTried === 0 ? (
            <p className="mt-1">Byte stayed quiet on this floor. It won&apos;t next time.</p>
          ) : (
            <p className="mt-1">
              You caught {hitl.caught} of {hitl.caught + hitl.wavedThrough} of Byte&apos;s bugs and waved {hitl.wavedThrough} through. You trusted
              its good code {hitl.trusted} of {hitl.trusted + hitl.doubted} times, and picked the best prompt first {hitl.bestPrompts} of{" "}
              {hitl.promptsTried} times.
            </p>
          )}
        </section>

        {skills && (
          <section data-testid="review-skills">
            <h2 className="text-lg font-bold text-ink">Skills check</h2>
            <p className="mt-1 font-display text-xl font-bold text-ink" data-testid="review-skills-line">{skills}</p>
            <p className="mt-1">
              {progress.skillsCheck?.final
                ? "Same 12 questions, before and after. That's how far you've come."
                : "Your starting point. You'll retake it before the final exam."}
            </p>
            <div className="mt-3">
              <ShareButton getText={() => skillsShareText(progress.skillsCheck, currentSiteUrl())} testId="review-skills-share" label="Share my skills check" />
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-ink">Strengths</h2>
          <ul className="mt-2 space-y-1.5" data-testid="review-strengths">
            {r.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <Icon name="check" className="mt-1 text-pass" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          {r.nextStep && (
            <p className="mt-4" data-testid="review-next-step">
              <b className="text-ink">One thing to try next:</b> {r.nextStep}
            </p>
          )}
        </section>
        <p className="italic">
          “Proud of you, {name}. Keep reading the code, keep running the checks, and keep Byte honest.” Maya
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        {r.complete && next?.firstTicketId ? (
          <Link href={`/ticket/${next.firstTicketId}`} className="rounded-lg btn-signal px-5 py-3 text-center ">
            {next.final ? "Start the final exam" : `Start next floor: ${next.title}`}
          </Link>
        ) : (
          <Link href="/" className="rounded-lg btn-signal px-5 py-3 text-center ">
            Back to the office
          </Link>
        )}
        <ShareButton getText={shareText} testId="review-copy" className="w-full px-5 py-3 text-base sm:w-auto" />
      </div>
    </article>
  );
}
