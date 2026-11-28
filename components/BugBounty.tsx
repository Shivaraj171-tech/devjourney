"use client";
// The Bug Bounty board on the HQ: short "mystery bug" side quests with no concept
// label (lib/game/bounty.ts). A card opens once the ticket that taught its
// concept is solved; never blocks anything. After solving, the card reveals the
// kind of bug and links back to the lesson.
import Link from "next/link";
import { withBase } from "@/lib/basePath";
import Icon from "./icons/Icon";
import { bountyProgress, bountyState, lessonHref, revealText, type BountyCard, type BountyState } from "@/lib/game/bounty";

type Props = {
  bounties: BountyCard[];
  isSolved: (ticketId: string) => boolean;
  /** XP earned on a solved bounty. */
  xpFor: (ticketId: string) => number;
  /** Open bounties matching the learner's focus areas (coding profile), best first: shown first, marked "Recommended for you". */
  recommended?: string[];
  /** Phone: locked cards fold into one line ("6 more open as you learn"), open and solved ones stay. */
  foldLocked?: boolean;
};

export default function BugBounty({ bounties, isSolved, xpFor, recommended = [], foldLocked = false }: Props) {
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
  const lockedCards = cards.filter((c) => c.state === "locked");
  const foldingLocked = foldLocked && lockedCards.length > 0;
  const openCards = cards.filter((c) => c.state === "open");
  const doneCards = cards.filter((c) => c.state === "done");
  const row = ({ card, state }: (typeof cards)[number]) => <BountyRow key={card.id} card={card} state={state} xp={xpFor(card.id)} />;
  return (
    <section data-testid="bug-bounty" aria-labelledby="bug-bounty-title" className="rounded-lg border border-rule p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="bug-bounty-title" className="font-display text-lg font-bold text-ink">
          <Icon name="posted" className="mr-2 h-5 w-5" />
          Bug Bounty
        </h2>
        <span className="text-sm text-slate-300" data-testid="bounty-progress">
          {solved} of {total} solved{open > 0 ? `, ${open} open` : ""}
        </span>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-slate-300">
        Mystery bugs from all over Orbit Orders. No lesson, no label: working out <i>what kind</i> of bug it is is part of the job.
        <span className={foldLocked ? "sr-only" : undefined}> Optional, and they never block your next ticket.</span>
      </p>
      {/* Open bounties are the notices pinned up: big, and first. Solved and locked ones are a plain list. */}
      {openCards.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-4">
          {openCards.map(({ card, recommended: rec }, i) => (
            <OpenNotice key={card.id} card={card} recommended={rec} tilt={TILT[i % TILT.length]} />
          ))}
        </ul>
      )}
      {doneCards.length > 0 && !foldSolved && <ul className="mt-4 divide-y divide-rule border-y border-rule">{doneCards.map(row)}</ul>}
      {lockedCards.length > 0 && !foldingLocked && <ul className="mt-4 divide-y divide-rule border-y border-rule">{lockedCards.map(row)}</ul>}
      {foldingLocked && (
        <details className="mt-3" data-testid="bounty-locked-fold">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-slate-200">
            {lockedCards.length} more open as you learn. See what opens them
          </summary>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">{lockedCards.map(row)}</ul>
        </details>
      )}
      {/* Many solved: they fold into one line, so the home screen stays short (audit flaw 8). */}
      {foldSolved && (
        <details className="mt-3">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-slate-200">{solved} solved bounties</summary>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">{doneCards.map(row)}</ul>
        </details>
      )}
    </section>
  );
}

/** "Mystery bug, about 5 min" and the reward: the same facts on every bounty. */
function Facts({ card, state, xp }: { card: BountyCard; state: BountyState; xp: number }) {
  return (
    <span className="text-sm text-slate-300">
      Mystery bug, about {card.estimatedMinutes} min,{" "}
      <span className="font-semibold text-ink tabular-nums" data-testid="bounty-xp">
        {state === "done" ? `+${xp} XP earned` : `${card.xp} XP`}
      </span>
    </span>
  );
}

/** Pinned by hand: each notice sits a little off straight, and none the same (from sm up; phones stay straight). */
const TILT = ["sm:-rotate-1", "sm:rotate-[0.7deg]", "sm:rotate-0", "sm:-rotate-[0.5deg]"];

/** An open bounty: a notice pinned to the board, as wide as its title, the one you can take now. */
function OpenNotice({ card, recommended, tilt }: { card: BountyCard; recommended: boolean; tilt: string }) {
  return (
    <li data-testid={`bounty-${card.id}`} data-state="open" data-recommended={recommended || undefined} className={`relative w-full pt-2 sm:w-auto sm:max-w-[19rem] ${tilt}`}>
      <Icon name="pin" className="absolute top-0 left-1/2 z-10 h-5 w-5 -translate-x-1/2 text-slate-300" />
      <Link href={`/ticket/${card.id}`} className="block rounded-sm border border-slate-500 bg-panel p-4 pt-5 hover:border-ink">
        {recommended && (
          <span data-testid="bounty-recommended" className="mb-1 block text-sm font-semibold text-byte">
            Picked for you<span className="sr-only"> (from your coding profile)</span>
          </span>
        )}
        <span className="block font-display text-lg leading-snug font-bold text-ink">{card.title}</span>
        <span className="mt-1 block">
          <Facts card={card} state="open" xp={0} />
        </span>
        <span className="mt-3 inline-block text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">Take the bounty</span>
      </Link>
    </li>
  );
}

/** A solved or locked bounty: one row of the list. */
function BountyRow({ card, state, xp }: { card: BountyCard; state: BountyState; xp: number }) {
  if (state === "done") {
    return (
      <li data-testid={`bounty-${card.id}`} data-state="done" className="flex items-start gap-3 py-3">
        <Icon name="spike" className="mt-0.5 h-5 w-5 text-pass" />
        <div className="min-w-0">
          <Link href={`/ticket/${card.id}`} className="font-semibold text-ink hover:underline">
            {card.title}
          </Link>
          <div>
            <Facts card={card} state={state} xp={xp} />
          </div>
          <p className="mt-1 text-sm text-pass" data-testid="bounty-reveal">
            {revealText(card.bugKind)}
          </p>
          {card.requires && (
            <a href={withBase(lessonHref(card.requires.id))} data-testid="bounty-lesson-link" className="inline-block min-h-6 py-1 text-sm font-semibold text-ink underline underline-offset-4">
              Revisit the lesson
            </a>
          )}
        </div>
      </li>
    );
  }
  return (
    <li data-testid={`bounty-${card.id}`} data-state="locked" className="flex items-start gap-3 py-3">
      <Icon name="lock" className="mt-0.5 h-5 w-5 text-slate-300" />
      <div className="min-w-0">
        <div className="font-semibold text-slate-200">{card.title}</div>
        <div>
          <Facts card={card} state={state} xp={xp} />
        </div>
        <p className="text-sm text-slate-300">
          {/* Not the ticket's title: that would name the concept, and the bug is a mystery. */}
          Opens after ticket #{card.requires?.number} of {card.requires?.seasonTitle}
        </p>
      </div>
    </li>
  );
}
