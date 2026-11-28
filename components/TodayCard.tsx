"use client";
// Returning players: the next ticket as the slip (the one primary action), and
// one line about the day: streak, warm-up, rank, progress, coding-profile focus.
// Replaces the pitch once the first ticket is merged (the pitch stays for first-time visitors).
import Link from "next/link";
import type { ReactNode } from "react";
import { rankFor, WARMUP_XP } from "@/lib/game/rules";
import NextTicketSlip from "./NextTicketSlip";
import Icon from "./icons/Icon";
import type { TicketSummary } from "./HQ";

type Props = {
  playerName: string;
  next: TicketSummary | undefined;
  nextFloor: number;
  /** The next ticket is part of the final exam (no concept label: it's an exam). */
  nextIsExam?: boolean;
  merged: number;
  total: number;
  streak: number;
  warmup: "ready" | "done" | "none";
  xp: number;
  /** One personalised line from the coding profile ("Focus this week: dictionaries — ..."). */
  focus?: string | null;
};

export default function TodayCard({ playerName, next, nextFloor, nextIsExam = false, merged, total, streak, warmup, xp, focus }: Props) {
  const { rank, next: nextRank, progress } = rankFor(xp);
  const name = playerName === "You" ? null : playerName;

  return (
    <section data-testid="today-card" aria-labelledby="today-title" className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] md:gap-10">
      <div className="min-w-0 md:order-2">
        {next ? (
          <NextTicketSlip
            ticket={next}
            where={nextIsExam ? "Final exam" : `Floor ${nextFloor}`}
            isExam={nextIsExam}
            cta={merged === 0 ? `Start ticket #${next.number}` : `Continue with ticket #${next.number}`}
            headingLevel={1}
            headingId="today-title"
            kicker={<>Welcome back{name ? `, ${name}` : ""}. Up next:</>}
          />
        ) : (
          <div className="slip-lift"><div className="slip rounded-sm px-6">
            <p className="text-sm font-semibold text-paper-muted">Welcome back{name ? `, ${name}` : ""}.</p>
            <h1 id="today-title" className="mt-1 font-display text-2xl font-bold text-paper-ink">
              Every floor is done. More seasons are coming soon.
            </h1>
          </div></div>
        )}
      </div>

      <div className="min-w-0 md:order-1 md:pt-2">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Your day at Orbit Orders</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-[15px] sm:grid-cols-1 sm:gap-y-2.5" aria-label="Your day">
          <Fact icon={<Icon name="flame" className={streak > 0 ? "text-orange-300" : "text-slate-300"} />} testId="today-streak">
            {streak > 0 ? `${streak}-day streak` : "No streak yet. Start one today"}
          </Fact>
          <Fact icon={<Icon name="mug" />} testId="today-warmup">
            {warmup === "ready" ? (
              <a href="#warm-up" className="inline-block underline decoration-signal decoration-2 underline-offset-4">
                Warm-up ready, +{WARMUP_XP} XP
              </a>
            ) : warmup === "done" ? (
              <>Warm-up done for today</>
            ) : (
              <span className="font-normal text-slate-300">Warm-up opens after a few more tickets</span>
            )}
          </Fact>
          <Fact icon={<Icon name={rank.icon} />} testId="today-rank">
            {nextRank ? (
              <>
                {rank.title}, {nextRank.minXp - xp} XP to {nextRank.title}
                <span
                  className="mt-1.5 block h-1.5 max-w-48 overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-label={`Progress to ${nextRank.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <span className="block h-full rounded-full bg-signal" style={{ width: `${Math.round(progress * 100)}%` }} />
                </span>
              </>
            ) : (
              <>
                {rank.title}, max rank
              </>
            )}
          </Fact>
          <Fact icon={<Icon name="spike" />} testId="today-merged">
            {merged} of {total} tickets merged
          </Fact>
        </ul>
        <p className="mt-5 max-w-prose text-[15px] text-slate-200" data-testid="today-focus">
          {focus ? <span className="font-semibold text-ink">{focus}</span> : <span>Your coding profile shows what your runs say about you.</span>}{" "}
          <Link href="/profile" data-testid="today-profile-link" className="inline-block py-1 font-semibold whitespace-nowrap text-ink underline decoration-signal decoration-2 underline-offset-4">
            {focus ? "See why" : "Open your profile"}
          </Link>
        </p>
      </div>
    </section>
  );
}

function Fact({ icon, testId, children }: { icon: ReactNode; testId: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2.5" data-testid={testId}>
      <span className="mt-0.5 text-slate-300">{icon}</span>
      <div className="min-w-0 font-semibold text-ink">{children}</div>
    </li>
  );
}
