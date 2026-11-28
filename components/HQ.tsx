"use client";
// Startup HQ: the home screen (design: docs/design/ui-redesign-plan.md).
//
// One primary action: the next ticket, as an order slip with the only amber
// button on the page. Then the building: the story floors as a directory (the
// floor you're on opens into a board), and the side floors (Robotics Lab,
// Manipulators, Bug Bounty). Newcomers see those as locked floors with what's
// inside and what opens them. The record (badges, the practice leaderboard,
// the app you're building) closes the page.
import Link from "next/link";
import { useState } from "react";
import FloorBoard, { sideFloorIcon, type Room } from "./FloorBoard";
import Icon from "./icons/Icon";
import NameTag from "./icons/NameTag";
import type { IconName } from "@/lib/icons";
import TodayCard from "./TodayCard";
import NextTicketSlip from "./NextTicketSlip";
import { useIsClient } from "@/lib/useIsClient";
import AppPreview, { featuresShippedText } from "./AppPreview";
import DailyWarmup, { warmupSession } from "./DailyWarmup";
import HumanInTheLoop from "./HumanInTheLoop";
import Onboarding from "./Onboarding";
import TeamChat from "./TeamChat";
import { useRoomChanges } from "@/lib/useOfficeSeen";
import { useNewBadges } from "@/lib/useNewBadges";
import BadgeToast from "./BadgeToast";
import { BADGES, currentStreak, FICTIONAL_NOTE, incidentBonus, leaderboard, type BadgeContext } from "@/lib/game/rules";
import { ticketProgress, totalXp, useProgress, actions } from "@/lib/progress/store";
import type { TicketType, Warmup } from "@/lib/content/types";
import { correctSeen, hitlScore, wrongSeen } from "@/lib/game/byte";
import { finalSeasonIndex, previousChainSeasonIndex, seasonOpen } from "@/lib/content/order";
import { certificateStatus } from "@/lib/game/skillsCheck";
import SkillsCheckCard from "./SkillsCheckCard";
import BackupReminder from "./BackupReminder";
import BugBounty from "./BugBounty";
import type { BountyCard } from "@/lib/game/bounty";
// Personalization (coding profile, lib/game/profile.ts).
import type { ProfileContent } from "@/lib/game/profile";
import { usePersonalization } from "@/lib/useCodingProfile";
import { boardName } from "./boardName";
import { useMediaQuery } from "@/lib/useMediaQuery";

/** Wider than a phone (Tailwind `sm`): the home shows its boards unfolded. */
const WIDE_QUERY = "(min-width: 640px)";

export type TicketSummary = {
  id: string;
  number: number;
  title: string;
  type: TicketType;
  newConcept: string;
  estimatedMinutes: number;
  hasQuiz: boolean;
  questionCount: number;
  /** Incident tickets only. */
  timeLimitMinutes?: number;
  seasonId: string;
};

export type SeasonSummary = {
  id: string;
  title: string;
  intro: string;
  /** false: off-chain (never gates the next season). */
  chain: boolean;
  /** true: the final exam, shown as "Final exam" on the board. */
  final: boolean;
  tickets: TicketSummary[];
};

/** A side floor (e.g. the Robotics Lab): off the story, opened as a whole by one story ticket. */
export type SideFloorSummary = SeasonSummary & {
  /** The story ticket that opens the floor. */
  requires: string;
  /** "Floor 1" (or "ticket #4 of Floor 1"): what to finish first. */
  gateText: string;
  icon: string;
  /** The name on the board: season.yaml `short_title`, else the title (e.g. "Manipulators · M1"). */
  label: string;
};

type Props = {
  seasons: SeasonSummary[];
  /** Side floors (the Robotics Lab), shown after the story floors. Never block anything. */
  sideFloors?: SideFloorSummary[];
  warmups: Warmup[];
  hasSkillsCheck: boolean;
  /** The Bug Bounty board (side-quest tickets), shown apart from the floors. */
  bounties?: BountyCard[];
  /** For the coding profile: concepts per ticket and warm-up (no code or answers). */
  profileContent?: ProfileContent;
};

/** One line on what's inside each side floor, for its locked row. */
const SIDE_PREVIEW: Record<string, string> = {
  s40: "Teach Grabby, the kitchen's packing robot arm, to find, reach and grasp boxes. Every run draws what your code made it do.",
  s41: "Module 1 of the manipulator track: rotations, quaternions and transforms, seen in a 3D viewer.",
  s42: "Module 2: forward kinematics, up to a real six-joint Universal Robots UR5e arm in 3D.",
  s43: "Module 3: Jacobians, singularities and how fast the gripper can move.",
  s44: "Module 4: inverse kinematics, from the law of cosines to Newton-Raphson on the UR5e.",
};

export default function HQ({ seasons, warmups, hasSkillsCheck, bounties = [], profileContent, sideFloors = [] }: Props) {
  const progress = useProgress();
  const xp = totalXp(progress);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  // Date-dependent values are computed after mount (static HTML has no "today").
  const isClient = useIsClient();
  const now = isClient ? new Date() : null;
  const streak = now ? currentStreak(progress.activeDays, now) : 0;

  const allTickets = seasons.flatMap((s) => s.tickets);
  const solved = allTickets.filter((t) => ticketProgress(progress, t.id).solved);
  const current = allTickets.find((t) => !ticketProgress(progress, t.id).solved);

  // Rooms merged or unlocked since the last visit animate once (lib/game/rooms.ts).
  // A floor opens once the nearest on-chain floor before it is finished (lib/content/order.ts).
  const isSolved = (id: string) => ticketProgress(progress, id).solved;
  const openIds = seasons.flatMap((s, floor) =>
    s.tickets.filter((t, i) => {
      if (isSolved(t.id)) return false;
      if (i > 0) return isSolved(s.tickets[i - 1].id);
      return seasonOpen(seasons, floor, isSolved);
    }).map((t) => t.id),
  );
  const fresh = useRoomChanges({ solved: solved.map((t) => t.id), open: openIds }, isClient);
  const personal = usePersonalization(progress, profileContent, now, warmups); // coding profile

  // Phones get the same sections, folded tighter: the home stays near 4,500 px (plan: under 5,000).
  const compact = !useMediaQuery(WIDE_QUERY);

  const hitl = hitlScore(Object.values(progress.tickets));
  const badgeCtx: BadgeContext = {
    streak,
    hitl,
    seasonTicketCounts: Object.fromEntries(seasons.map((s) => [s.id, s.tickets.length])),
    solved: solved.map((t) => {
      const tp = ticketProgress(progress, t.id);
      return {
        type: t.type,
        hintsUsed: tp.hintsUsed,
        runs: tp.runs,
        seasonId: t.seasonId,
        quizPerfect: tp.quizDone && t.questionCount > 0 && tp.quizFirstTryCorrect === t.questionCount,
        falseAlarms: tp.reviewFalseAlarms?.length ?? 0,
        beatTheClock:
          t.timeLimitMinutes !== undefined && !!tp.incidentStartedAt && !!tp.solvedAt
            ? incidentBonus(Date.parse(tp.incidentStartedAt), Date.parse(tp.solvedAt), t.timeLimitMinutes) > 0
            : false,
      };
    }),
  };

  const board = now ? leaderboard({ name: progress.playerName, xp }, progress.activeDays.length) : [];
  const myPlace = board.findIndex((b) => b.isYou) + 1;

  // Progress lives in the browser: avoid flashing "first day" to returning players.
  // Badges earned since the last office visit pop up once.
  const newBadgeIds = useNewBadges(
    BADGES.filter((b) => b.earned(badgeCtx)).map((b) => b.id),
    isClient,
  );

  if (!isClient) {
    return <div className="p-8 text-center text-slate-300">Opening the office…</div>;
  }

  const solvedIds = new Set(solved.map((t) => t.id));
  const returning = solved.length > 0;

  // Today's warm-up session: ready, done, or not unlocked yet (hidden until there is one).
  const ticketConcepts = Object.fromEntries(allTickets.map((t) => [t.id, t.newConcept]));
  const warmupPlan = now ? warmupSession(warmups, progress, solvedIds, ticketConcepts, now, personal.mastery) : null;
  const warmupAvailable = !!warmupPlan && warmupPlan.items.length > 0;
  const warmupStatus = warmupPlan?.done ? "done" : warmupAvailable ? "ready" : "none";

  // The floor you're working on starts open; every other floor is a one-line row.
  const currentFloor = current ? seasons.findIndex((s) => s.id === current.seasonId) : seasons.length - 1;
  const hitlHasData = wrongSeen(hitl) + correctSeen(hitl) + hitl.promptsTried + hitl.pending > 0;

  // The final exam: open once the floor before it is done; the certificate needs it all.
  const finalIndex = finalSeasonIndex(seasons);
  const finalSeason = finalIndex === -1 ? undefined : seasons[finalIndex];
  const finalUnlocked = !!finalSeason && seasonOpen(seasons, finalIndex, isSolved);
  const certificate = certificateStatus(
    (finalSeason?.tickets ?? []).map((t) => ({ id: t.id, title: t.title, solved: solvedIds.has(t.id) })),
    progress.skillsCheck,
  );

  // Side floors: rooms and state. Only ONE side floor starts unfolded: the first open one with
  // work left that you've started (or, once the story is done, the first open one with work left).
  const labs = sideFloors.map((lab) => {
    const labOpen = isSolved(lab.requires);
    const rooms: Room[] = lab.tickets.map((t, i) => {
      const tp = ticketProgress(progress, t.id);
      const prevSolved = i === 0 ? labOpen : isSolved(lab.tickets[i - 1].id);
      return { ticket: t, state: tp.solved ? "done" : prevSolved ? "open" : "locked", xp: tp.solveXp + tp.quizXp, quizWaiting: t.hasQuiz && !tp.quizDone };
    });
    const started = rooms.some((r) => r.state === "done");
    const workLeft = rooms.some((r) => r.state !== "done");
    return { lab, labOpen, rooms, candidate: labOpen && workLeft && (started || current === undefined) };
  });
  const unfoldedLab = labs.find((l) => l.candidate)?.lab.id;

  // The skills check is offered once ticket 1 is merged, not in minute one (audit flaw 4).
  const showSkillsCard = hasSkillsCheck && progress.onboarded && returning;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <BadgeToast ids={newBadgeIds} />
      {now && !progress.onboarded && solved.length === 0 && <Onboarding />}

      {returning ? (
        <TodayCard
          playerName={progress.playerName}
          next={current}
          nextFloor={currentFloor + 1}
          nextIsExam={!!seasons[currentFloor]?.final && !!current}
          merged={solved.length}
          total={allTickets.length}
          streak={streak}
          warmup={warmupStatus}
          xp={xp}
          focus={personal.focus}
        />
      ) : (
        <Pitch current={current} />
      )}

      <div className="mt-7 space-y-7 sm:mt-14 sm:space-y-14">
        {/* Back-up nudge (lib/progress/backup.ts): only after 7+ days without a backup. */}
        {now && <BackupReminder ticketsMerged={solved.length} startedAt={progress.startedAt} now={now} />}

        {/* Today's warm-up, near the top for returning players (it was at the very bottom). */}
        {now && warmupAvailable && <DailyWarmup warmups={warmups} progress={progress} solvedTicketIds={solvedIds} ticketConcepts={ticketConcepts} now={now} mastery={personal.mastery} />}

        {showSkillsCard && <SkillsCheckCard skillsCheck={progress.skillsCheck} finalUnlocked={finalUnlocked} certificateReady={certificate.eligible} />}

        {/* ---------- the building: story floors ---------- */}
        <section aria-labelledby="building-title">
          <h2 id="building-title" className="font-display text-2xl font-bold text-ink">
            The building
          </h2>
          <p className="mt-1 max-w-prose text-slate-300">Each floor is a few weeks at Orbit Orders. Finish one and the next opens.</p>
          <div className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule">
            {seasons.map((season, floor) => {
              // A floor opens once the nearest on-chain floor below it is finished.
              const floorOpen = seasonOpen(seasons, floor, isSolved);
              const rooms: Room[] = season.tickets.map((t, i) => {
                const tp = ticketProgress(progress, t.id);
                const prevSolved = i === 0 ? floorOpen : solvedIds.has(season.tickets[i - 1].id);
                return {
                  ticket: t,
                  state: tp.solved ? "done" : prevSolved ? "open" : "locked",
                  xp: tp.solveXp + tp.quizXp,
                  quizWaiting: t.hasQuiz && !tp.quizDone,
                  fresh: fresh[t.id],
                };
              });
              const defaultOpen = floor === currentFloor;
              return (
                <FloorBoard
                  key={season.id}
                  floor={floor + 1}
                  season={season}
                  rooms={rooms}
                  floorOpen={floorOpen}
                  gateFloor={previousChainSeasonIndex(seasons, floor) + 1}
                  extra={
                    season.final && certificate.eligible ? (
                      <Link href="/certificate" data-testid="certificate-link" className="inline-block py-1 text-sm font-semibold text-amber-300 hover:underline">
                        Your certificate
                      </Link>
                    ) : undefined
                  }
                  compact={compact && returning}
                  expanded={toggled[season.id] ?? defaultOpen}
                  onToggle={() => setToggled((m) => ({ ...m, [season.id]: !(m[season.id] ?? defaultOpen) }))}
                />
              );
            })}
          </div>
        </section>

        {/* ---------- side floors: optional, never block the story ---------- */}
        <section aria-labelledby="side-floors-title" data-testid="side-floors">
          <h2 id="side-floors-title" className="font-display text-2xl font-bold text-ink">
            Side floors
          </h2>
          <p className="mt-1 max-w-prose text-slate-300">Optional extras. They never block the story, and each opens when you have learned what it needs.</p>
          {returning ? (
            <div className="mt-4 space-y-6">
              <div className="divide-y divide-rule overflow-hidden rounded-xl border border-rule">
                {labs.map(({ lab, labOpen, rooms }) => {
                  // Phone: a module that waits on another side floor keeps its status line; its
                  // preview shows once the module before it opens (the M1 row already says what is inside).
                  const waitsOnSide = !labOpen && labs.some((o) => o.lab.id !== lab.id && !o.labOpen && o.lab.tickets.some((t) => t.id === lab.requires));
                  // Phone: every side floor starts as its one-line row (status and what opens it).
                  const defaultOpen = !compact && lab.id === unfoldedLab;
                  return (
                    <FloorBoard
                      key={lab.id}
                      floor={0}
                      season={lab}
                      rooms={rooms}
                      floorOpen={labOpen}
                      label={lab.label}
                      plateIcon={sideFloorIcon(lab.id)}
                      gateText={lab.gateText}
                      testId={`side-floor-${lab.id}`}
                      roomPrefix="lab-room"
                      hasReview={false}
                      preview={compact && waitsOnSide ? undefined : SIDE_PREVIEW[lab.id]}
                      expanded={toggled[lab.id] ?? defaultOpen}
                      onToggle={() => setToggled((m) => ({ ...m, [lab.id]: !(m[lab.id] ?? defaultOpen) }))}
                    />
                  );
                })}
              </div>
              <BugBounty
                bounties={bounties}
                isSolved={isSolved}
                xpFor={(id) => {
                  const tp = ticketProgress(progress, id);
                  return tp.solveXp + tp.quizXp;
                }}
                recommended={personal.recommended}
                foldLocked={compact}
              />
            </div>
          ) : (
            <LockedSideFloors sideFloors={sideFloors} bounties={bounties} ticketIndex={(id) => { const i = allTickets.findIndex((t) => t.id === id); return i === -1 ? Infinity : i; }} />
          )}
        </section>

        {now && <TeamChat seasons={seasons} progress={progress} streak={streak} now={now} recent={compact ? 1 : undefined} />}

        {/* ---------- your record ---------- */}
        <section aria-labelledby="record-title">
          <h2 id="record-title" className="font-display text-2xl font-bold text-ink">
            Your record
          </h2>
          {hitlHasData && (
            <div className="mt-4">
              <HumanInTheLoop score={hitl} />
            </div>
          )}
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
            <MiniLeaderboard board={board} myPlace={myPlace} playerName={progress.playerName} rows={compact ? 3 : 5} />
            <Badges ctx={badgeCtx} foldUpNext={compact} />
          </div>
          <div className="mt-6">
            {returning || compact ? (
              <details className="rounded-lg border border-rule" data-testid="app-preview-fold">
                <summary className="min-h-11 cursor-pointer px-5 py-3">
                  <span className="font-display font-bold text-ink">
                    <Icon name="scooter" className="mr-2 h-5 w-5" />
                    The app you&apos;re building
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-300">{featuresShippedText(solvedIds)}</span>
                </summary>
                <AppPreview solved={solvedIds} playerName={progress.playerName} bare />
              </details>
            ) : (
              <AppPreview solved={solvedIds} playerName={progress.playerName} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** First visit: the promise on the left, the first ticket as the slip on the right. */
function Pitch({ current }: { current: TicketSummary | undefined }) {
  return (
    <section aria-labelledby="pitch-title" className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] md:gap-12">
      <div className="min-w-0">
        <h1 id="pitch-title" className="font-display text-[1.75rem] leading-[1.1] font-bold text-ink sm:text-[2.6rem]">
          Learn to code with an AI teammate, and learn to catch its mistakes.
        </h1>
        <p className="mt-3 max-w-prose text-base text-slate-200 sm:mt-4 sm:text-lg">
          Byte, the office AI at Orbit Orders, writes code fast but not always right. You&apos;ll learn Python by reading, running and fixing the
          real code of one growing food-delivery app, so you can decide what ships.
        </p>
        <ol className="mt-4 grid max-w-xl sm:mt-6 grid-cols-2 gap-x-6 gap-y-2 text-[15px] text-slate-200 sm:grid-cols-4" aria-label="How a ticket works">
          {["Read the ticket", "Learn the idea", "Fix and run", "Merge it"].map((s, i) => (
            <li key={s} className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-signal" aria-hidden>
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-300 sm:mt-6">Short tickets, 10 to 20 minutes. Free, no sign-up, nothing to install.</p>
      </div>
      {current && (
        <NextTicketSlip ticket={current} where="Floor 1, your first week" cta={`Start ticket #${current.number}`} headingLevel={2} kicker="Your first ticket" />
      )}
    </section>
  );
}

/** Newcomers: the side floors exist, are locked, and say what's inside and what opens them. */
function LockedSideFloors({ sideFloors, bounties, ticketIndex }: { sideFloors: SideFloorSummary[]; bounties: BountyCard[]; ticketIndex: (id: string) => number }) {
  const lab = sideFloors.find((s) => s.id === "s40");
  const modules = sideFloors.filter((s) => s.id !== "s40");
  // The bounty that opens first: the one whose required ticket comes earliest in the story.
  const firstBounty = bounties.filter((b) => b.requires).sort((a, b) => ticketIndex(a.requires!.id) - ticketIndex(b.requires!.id))[0];
  const rows: { id: string; icon: IconName; name: string; inside: string; opens: string; size: string }[] = [];
  if (lab) {
    rows.push({ id: lab.id, icon: sideFloorIcon(lab.id), name: lab.label, inside: SIDE_PREVIEW[lab.id] ?? "", opens: `Opens after ${lab.gateText}.`, size: `${lab.tickets.length} tickets` });
  }
  if (modules.length > 0) {
    const n = modules.reduce((sum, m) => sum + m.tickets.length, 0);
    rows.push({
      id: "manipulators",
      icon: sideFloorIcon(modules[0].id),
      name: modules.length > 1 ? `Manipulators, modules 1 to ${modules.length}` : modules[0].label,
      inside: "A real robot arm (the UR5e) in a 3D viewer: rotations, forward and inverse kinematics, Jacobians. Deep lessons with the maths step by step.",
      opens: `Module 1 opens after ${modules[0].gateText}; each module opens the next.`,
      size: `${n} tickets`,
    });
  }
  if (bounties.length > 0) {
    rows.push({
      id: "bounty",
      icon: "posted",
      name: "Bug Bounty",
      inside: "Short mystery bugs from all over the app. No lesson and no label: part of the job is working out what kind of bug it is.",
      opens: firstBounty?.requires ? `The first opens after ticket #${firstBounty.requires.number} of ${firstBounty.requires.seasonTitle}; the rest open as you learn.` : "Each opens once you've learned what it needs.",
      size: `${bounties.length} bounties`,
    });
  }
  return (
    <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule" data-testid="locked-side-floors">
      {rows.map((r) => (
        <li key={r.id} className="grid gap-x-4 gap-y-1 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5" data-testid={`locked-floor-${r.id}`} data-state="locked">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-slate-100">
              <Icon name={r.icon} className="mr-2 h-5 w-5 text-slate-300" />
              {r.name} <span className="sr-only">(locked)</span>
            </h3>
            <p className="mt-1 max-w-prose text-[15px] text-slate-300">{r.inside}</p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold text-slate-100">
              <Icon name="lock" className="mr-1" />
              {r.opens}
            </p>
            <p className="text-slate-300">{r.size}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Earned badges, plus the next few to aim for. Before the first badge it's a compact teaser. */
function Badges({ ctx, foldUpNext = false }: { ctx: BadgeContext; foldUpNext?: boolean }) {
  const earned = BADGES.filter((b) => b.earned(ctx));
  const locked = BADGES.filter((b) => !b.earned(ctx));
  const upNext = locked.slice(0, 3);
  return (
    <section className="lg:pt-5" data-testid="badges">
      <h3 className="font-display text-lg font-bold text-ink">
        {earned.length === 0 ? "Badges you can earn" : `Badges, ${earned.length} of ${BADGES.length}`}
      </h3>
      {earned.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Earned badges">
          {earned.map((b) => (
            <li key={b.id} title={b.description} className="rounded-md border border-slate-600 px-2.5 py-1 text-sm font-semibold text-ink">
              <Icon name={b.icon} className="mr-1.5" />
              {b.title}
            </li>
          ))}
        </ul>
      )}
      {upNext.length > 0 && foldUpNext && (
        <details className="mt-3" data-testid="badges-up-next">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-semibold text-slate-200">
            {earned.length === 0 ? `Your first ${upNext.length} to earn` : `${upNext.length} up next`}, {locked.length} still to earn
          </summary>
          <BadgeList badges={upNext} />
        </details>
      )}
      {upNext.length > 0 && !foldUpNext && (
        <>
          <h4 className="mt-4 text-sm font-semibold text-slate-200">{earned.length === 0 ? "Your first ones" : "Up next"}</h4>
          <BadgeList badges={upNext} />
          {locked.length > upNext.length && <p className="mt-3 text-sm text-slate-300">+{locked.length - upNext.length} more to discover as you play.</p>}
        </>
      )}
    </section>
  );
}

function BadgeList({ badges }: { badges: typeof BADGES }) {
  return (
          <ul className="mt-2 space-y-2">
            {badges.map((b) => (
              <li key={b.id} className="flex items-start gap-3">
                <Icon name={b.icon} className="mt-0.5 h-5 w-5 text-slate-300" />
                <div>
                  <div className="text-sm font-semibold text-ink">{b.title}</div>
                  <div className="text-sm text-slate-300">{b.description}</div>
                </div>
              </li>
            ))}
          </ul>
  );
}

/** The office leaderboard widget. Labelled as a practice board with made-up teammates. */
function MiniLeaderboard({ board, myPlace, playerName, rows }: { board: ReturnType<typeof leaderboard>; myPlace: number; playerName: string; rows: number }) {
  // The top `rows`, and your own row if it is below them.
  const shown = board.map((p, i) => ({ p, i })).filter(({ p, i }) => i < rows || p.isYou);
  return (
    <section className="rounded-xl border border-rule bg-panel p-5" data-testid="mini-leaderboard">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-ink">Office leaderboard</h3>
        <Link href="/leaderboard" className="py-1 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
          See all
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-300" data-testid="fictional-note">
        {FICTIONAL_NOTE}
      </p>
      {myPlace > 0 && <p className="mt-2 text-sm font-semibold text-ink">You&apos;re #{myPlace} of {board.length}.</p>}
      <ol className="mt-3 space-y-1">
        {shown.map(({ p, i }) => (
          <li key={p.name + p.role} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${p.isYou ? "bg-signal/15 font-semibold text-ink" : "text-slate-200"}`}>
            <span className="w-4 text-slate-300 tabular-nums">{i + 1}</span>
            <NameTag name={boardName(p, playerName)} byte={p.byte} you={p.isYou} size="sm" />
            <span className="min-w-0 flex-1 truncate" data-testid="board-name">{boardName(p, playerName)}</span>
            <span className="tabular-nums">{p.xp}</span>
          </li>
        ))}
      </ol>
      <NameEditor name={playerName} />
    </section>
  );
}

function NameEditor({ name }: { name: string }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        actions.setName(value);
        setValue("");
      }}
    >
      <label className="sr-only" htmlFor="board-name">
        Your name on the board
      </label>
      <input
        id="board-name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={name === "You" ? "Your name on the board" : `Rename (${name})`}
        maxLength={24}
        className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-600 bg-page px-3 py-1.5 text-sm text-ink placeholder:text-slate-300"
      />
      <button className="min-h-10 rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-800">Save</button>
    </form>
  );
}
