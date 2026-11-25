"use client";
// The Bug Bounty board on the HQ: short "mystery bug" side quests with no concept
// label (lib/game/bounty.ts). A card opens once the ticket that taught its
// concept is solved; never blocks anything. After solving, the card reveals the
// kind of bug and links back to the lesson.
import Link from "next/link";
import { withBase } from "@/lib/basePath";
import { bountyProgress, bountyState, lessonHref, revealText, type BountyCard, type BountyState } from "@/lib/game/bounty";

type Props = {
  bounties: BountyCard[];
  isSolved: (ticketId: string) => boolean;
  /** XP earned on a solved bounty. */
  xpFor: (ticketId: string) => number;
  /** Open bounties matching the learner's focus areas (coding profile), best first: shown first, marked "Recommended for you". */
  recommended?: string[];
};

export default function BugBounty({ bounties, isSolved, xpFor, recommended = [] }: Props) {
  if (bounties.length === 0) return null;
  // Recommended open ones first (in focus order); the rest keep the board's order.
  const rank = (c: { card: BountyCard; recommended: boolean }) => (c.recommended ? recommended.indexOf(c.card.id) : recommended.length);
  const cards = bounties
    .map((b, i) => {
      const state = bountyState(b, isSolved);
      return { card: b, state, i, recommended: state === "open" && recommended.includes(b.id) };
    })
    .sort((a, b) => rank(a) - rank(b) || a.i - b.i);
  const { solved, open, total } = bountyProgress(cards.map((c) => c.state));
  const foldSolved = solved >= 4;
  return (
    <section data-testid="bug-bounty" aria-labelledby="bug-bounty-title" className="rounded-xl border border-rule bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="bug-bounty-title" className="font-display text-lg font-bold text-ink">
          🐞 Bug Bounty
        </h2>
        <span className="text-sm text-slate-300" data-testid="bounty-progress">
          {solved}/{total} solved{open > 0 ? ` · ${open} open` : ""}
        </span>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-slate-300">
        Mystery bugs from all over Orbit Orders. No lesson, no label: working out <i>what kind</i> of bug it is is part of the job.
        Optional, and they never block your next ticket.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(foldSolved ? cards.filter((c) => c.state !== "done") : cards).map(({ card, state, recommended: rec }) => (
          <BountyCardView key={card.id} card={card} state={state} xp={xpFor(card.id)} recommended={rec} />
        ))}
      </ul>
      {/* Many solved: they fold into one line, so the home screen stays short (audit flaw 8). */}
      {foldSolved && (
        <details className="mt-3">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-slate-200">{solved} solved bounties</summary>
          <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards
              .filter((c) => c.state === "done")
              .map(({ card, state }) => (
                <BountyCardView key={card.id} card={card} state={state} xp={xpFor(card.id)} />
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function BountyCardView({ card, state, xp, recommended = false }: { card: BountyCard; state: BountyState; xp: number; recommended?: boolean }) {
  const header = (
    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-lime-100">
      <span>🐞 Mystery bug · ~{card.estimatedMinutes} min</span>
      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200" data-testid="bounty-xp">
        {state === "done" ? `+${xp} XP` : `🪙 ${card.xp} XP`}
      </span>
    </div>
  );
  const title = <div className="mt-1.5 text-sm leading-snug font-bold text-white">{card.title}</div>;

  if (state === "locked") {
    return (
      <li data-testid={`bounty-${card.id}`} data-state="locked" className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 opacity-80">
        {header}
        {title}
        <p className="mt-2 text-xs text-slate-300">
          {/* Not the ticket's title: that would name the concept, and the bug is a mystery. */}
          🔒 Opens after ticket #{card.requires?.number} of {card.requires?.seasonTitle}
        </p>
      </li>
    );
  }
  if (state === "done") {
    return (
      <li data-testid={`bounty-${card.id}`} data-state="done" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        {header}
        <Link href={`/ticket/${card.id}`} className="block py-1 hover:underline">
          {title}
        </Link>
        <p className="mt-2 text-xs text-emerald-100" data-testid="bounty-reveal">
          ✅ {revealText(card.bugKind)}
        </p>
        {card.requires && (
          <a href={withBase(lessonHref(card.requires.id))} data-testid="bounty-lesson-link" className="mt-1 inline-block min-h-6 py-1 text-xs font-semibold text-cyan-300 hover:underline">
            📘 Revisit the lesson
          </a>
        )}
      </li>
    );
  }
  return (
    <li data-testid={`bounty-${card.id}`} data-state="open" data-recommended={recommended || undefined}>
      <Link
        href={`/ticket/${card.id}`}
        className="block rounded-xl border-2 border-lime-400/60 bg-lime-500/10 p-3 transition hover:bg-lime-500/20"
      >
        {recommended && (
          <span data-testid="bounty-recommended" className="mb-1.5 inline-block rounded-full bg-cyan-400/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
            ⭐ Recommended for you<span className="sr-only"> (from your coding profile)</span>
          </span>
        )}
        {header}
        {title}
        <span className="mt-2 inline-block rounded-lg bg-lime-400 px-2.5 py-1 text-xs font-semibold text-slate-950">Take the bounty →</span>
      </Link>
    </li>
  );
}
