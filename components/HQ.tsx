"use client";
// Startup HQ: the home screen. First visit: the pitch, the first floor and
// little else (empty sections stay hidden until they have data). Returning:
// a "Today" card, then the floor you're on as a sprint board.
import Link from "next/link";
import { useState } from "react";
import FloorBoard, { type Room } from "./FloorBoard";
import TodayCard from "./TodayCard";
import { useIsClient } from "@/lib/useIsClient";
import AppPreview from "./AppPreview";
import DailyWarmup from "./DailyWarmup";
import HumanInTheLoop from "./HumanInTheLoop";
import Onboarding from "./Onboarding";
import TeamChat from "./TeamChat";
import { useRoomChanges } from "@/lib/useOfficeSeen";
import { useNewBadges } from "@/lib/useNewBadges";
import BadgeToast from "./BadgeToast";
import { BADGES, currentStreak, dayKey, incidentBonus, leaderboard, pickWarmup, type BadgeContext } from "@/lib/game/rules";
import { daysSinceStart, ticketProgress, totalXp, useProgress, actions } from "@/lib/progress/store";
import type { TicketType, Warmup } from "@/lib/content/types";
import { correctSeen, hitlScore, wrongSeen } from "@/lib/game/byte";
import { finalSeasonIndex, previousChainSeasonIndex, seasonOpen } from "@/lib/content/order";
import { certificateStatus } from "@/lib/game/skillsCheck";
import SkillsCheckCard from "./SkillsCheckCard";

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

type Props = { seasons: SeasonSummary[]; warmups: Warmup[]; hasSkillsCheck: boolean };

export default function HQ({ seasons, warmups, hasSkillsCheck }: Props) {
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

  const board = now ? leaderboard({ name: progress.playerName, xp }, daysSinceStart(progress, now)) : [];
  const myPlace = board.findIndex((b) => b.isYou) + 1;

  // Progress lives in the browser: avoid flashing "first day" to returning players.
  // Badges earned since the last office visit pop up once.
  const newBadgeIds = useNewBadges(
    BADGES.filter((b) => b.earned(badgeCtx)).map((b) => b.id),
    isClient,
  );

  if (!isClient) {
    return <div className="p-8 text-center text-slate-400">Opening the office…</div>;
  }

  const solvedIds = new Set(solved.map((t) => t.id));
  const returning = solved.length > 0;

  // Today's warm-up: ready, done, or not unlocked yet (hidden until there is one).
  const today = now ? dayKey(now) : "";
  const warmupDone = !!progress.warmups?.[today];
  const warmupAvailable =
    warmupDone ||
    pickWarmup(warmups, solvedIds, new Set(Object.values(progress.warmups ?? {}).map((w) => w.id)), today) !== null;
  const warmupStatus = warmupDone ? "done" : warmupAvailable ? "ready" : "none";

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

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
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
        />
      ) : (
        <Pitch current={current} />
      )}

      {hasSkillsCheck && progress.onboarded && (
        <SkillsCheckCard skillsCheck={progress.skillsCheck} finalUnlocked={finalUnlocked} certificateReady={certificate.eligible} />
      )}

      {now && <TeamChat seasons={seasons} progress={progress} streak={streak} now={now} />}

      {/* ---------- office floors: a sprint board per floor ---------- */}
      <div className="space-y-3">
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
                  <Link href="/certificate" data-testid="certificate-link" className="text-sm font-semibold text-amber-300 hover:underline">
                    🎓 Your certificate →
                  </Link>
                ) : undefined
              }
              expanded={toggled[season.id] ?? defaultOpen}
              onToggle={() => setToggled((m) => ({ ...m, [season.id]: !(m[season.id] ?? defaultOpen) }))}
            />
          );
        })}
      </div>

      {now && warmupAvailable && <DailyWarmup warmups={warmups} progress={progress} solvedTicketIds={solvedIds} now={now} />}

      {hitlHasData && <HumanInTheLoop score={hitl} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <AppPreview solved={solvedIds} playerName={progress.playerName} />
        <Badges ctx={badgeCtx} />

        {/* ---------- mini leaderboard ---------- */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">🏆 Office leaderboard</h2>
            <Link href="/leaderboard" className="text-sm text-cyan-300 hover:underline">See all →</Link>
          </div>
          {myPlace > 0 && <p className="mt-1 text-sm text-slate-300">You&apos;re #{myPlace} in the office.</p>}
          <ol className="mt-3 space-y-1.5">
            {board.slice(0, 5).map((p, i) => (
              <li key={p.name + p.role} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${p.isYou ? "bg-violet-500/20 text-white" : "bg-slate-950/50 text-slate-300"}`}>
                <span className="w-5 text-slate-400">{i + 1}</span>
                <span className="text-lg" aria-hidden>{p.avatar}</span>
                <span className="min-w-0 flex-1 truncate">{p.isYou ? youLabel(progress.playerName) : p.name}</span>
                <span className="font-mono text-cyan-300">{p.xp}</span>
              </li>
            ))}
          </ol>
          <NameEditor name={progress.playerName} />
        </section>
      </div>
    </div>
  );
}

/** First visit: the full pitch. */
function Pitch({ current }: { current: TicketSummary | undefined }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-950 via-slate-900 to-cyan-950 p-6 sm:p-8">
      <div className="relative z-10 max-w-2xl">
        <p className="text-sm font-semibold tracking-widest text-cyan-300 uppercase">Startup HQ · Orbit Orders</p>
        <h1 className="mt-2 text-3xl leading-tight font-bold text-white sm:text-4xl">
          Learn to code with an AI teammate, and learn to catch its mistakes.
        </h1>
        <p className="mt-3 text-slate-300">
          Byte, our office AI, writes code fast but not always right. You&apos;ll learn Python by reading, running and fixing
          the real code of <b className="text-white">one growing app</b>, so when AI writes code for you, you can understand it,
          debug it, and decide what ships. <b className="text-white">Be the human in the loop.</b>
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="What you practise">
          {["📖 Read it", "▶️ Run it", "🐞 Debug it", "🔍 Review it", "✅ Decide"].map((skill) => (
            <li key={skill} className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-slate-200">
              {skill}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {current && (
            <Link
              href={`/ticket/${current.id}`}
              data-testid="continue"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              Start your first day →
            </Link>
          )}
          <span className="text-sm text-slate-300">Short tickets (10–20 min) · no setup · free</span>
        </div>
      </div>
      <div className="pointer-events-none absolute right-0 -bottom-8 text-[10rem] opacity-20 select-none sm:text-[12rem]" aria-hidden>
        🤖
      </div>
    </section>
  );
}

/** Earned badges, plus the next few to aim for. Before the first badge it's a compact teaser. */
function Badges({ ctx }: { ctx: BadgeContext }) {
  const earned = BADGES.filter((b) => b.earned(ctx));
  const locked = BADGES.filter((b) => !b.earned(ctx));
  const upNext = locked.slice(0, 3);
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5" data-testid="badges">
      <h2 className="text-lg font-bold text-white">
        {earned.length === 0 ? "🏅 Badges you can earn" : `🏅 Badges · ${earned.length}/${BADGES.length}`}
      </h2>
      {earned.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Earned badges">
          {earned.map((b) => (
            <li key={b.id} title={b.description} className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
              <span aria-hidden>{b.emoji}</span> {b.title}
            </li>
          ))}
        </ul>
      )}
      {upNext.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-300 uppercase">{earned.length === 0 ? "Your first ones" : "Up next"}</h3>
          <ul className="mt-2 space-y-2">
            {upNext.map((b) => (
              <li key={b.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                <span className="text-xl grayscale" aria-hidden>{b.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <div className="text-xs text-slate-300">{b.description}</div>
                </div>
              </li>
            ))}
          </ul>
          {locked.length > upNext.length && (
            <p className="mt-2 text-xs text-slate-300">+{locked.length - upNext.length} more to discover as you play.</p>
          )}
        </>
      )}
    </section>
  );
}

function youLabel(name: string): string {
  return name === "You" ? "You" : `${name} (you)`;
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
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={name === "You" ? "Your name on the board" : `Rename (${name})`}
        maxLength={24}
        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white placeholder:text-slate-500"
      />
      <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Save</button>
    </form>
  );
}
