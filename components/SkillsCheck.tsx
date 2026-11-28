"use client";
// /skills-check/: the 12-question skills check. One question at a time, one
// answer each, no feedback until the end (it's a measurement, not a lesson).
// The baseline only shows the score: the answers are revealed after the final
// check, so the final is a fair re-test. Scoring: lib/game/skillsCheck.ts.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import ShareButton from "./ShareButton";
import { InlineMarkdown } from "./Markdown";
import { currentSiteUrl } from "@/lib/basePath";
import type { SkillsCheck as SkillsCheckContent, SkillsCheckItem } from "@/lib/content/types";
import { shuffledOrder } from "@/lib/game/shuffle";
import {
  comparisonText,
  certificateStatus,
  NOT_SURE,
  TYPICAL_BASELINE,
  makeResult,
  nextAttempt,
  skillsShareText,
  type SkillsAttempt,
  type SkillsCheckProgress,
} from "@/lib/game/skillsCheck";
import { skillsCheckActions, ticketProgress, useProgress } from "@/lib/progress/store";
import { useIsClient } from "@/lib/useIsClient";
import Icon from "@/components/icons/Icon";

type Props = {
  check: SkillsCheckContent;
  /** Tickets that must all be merged before the final exam (and the final check) opens. */
  finalGate: string[];
  /** The final exam's tickets ([] if the content has no final exam). */
  finalTickets: { id: string; title: string }[];
};

const KIND_LABEL: Record<SkillsCheckItem["kind"], string> = {
  predict: "Predict the output",
  catch_input: "Which input catches the bug?",
  spot_line: "Spot the bug",
  pick_answer: "Which of Byte's answers is right?",
};

export default function SkillsCheck({ check, finalGate, finalTickets }: Props) {
  const progress = useProgress();
  const isClient = useIsClient();
  const [started, setStarted] = useState<SkillsAttempt | null>(null);
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (!isClient) return <div className="p-8 text-center text-slate-400">Opening the skills check…</div>;

  const solved = (id: string) => ticketProgress(progress, id).solved;
  const finalUnlocked = finalTickets.length > 0 && finalGate.every(solved);
  const sc = progress.skillsCheck;
  const attempt = started ?? nextAttempt(sc, finalUnlocked);

  if (!attempt) {
    const certificate = certificateStatus(finalTickets.map((t) => ({ ...t, solved: solved(t.id) })), sc);
    return <Results check={check} sc={sc} finalUnlocked={finalUnlocked} certificateReady={certificate.eligible} />;
  }

  const order = shuffledOrder(check.items.length, `skills:${attempt}`);
  const items = order.map((i) => check.items[i]);

  if (!started) {
    return (
      <Shell>
        <section className="rounded-lg border border-rule bg-panel p-6" data-testid="skills-intro">
          <p className="text-sm text-slate-300">
            {attempt === "baseline" ? "Baseline" : "Final"} skills check
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {attempt === "baseline" ? "Where are you starting from?" : "How far have you come?"}
          </h1>
          <p className="mt-3 text-slate-300">{check.intro}</p>
          <p className="mt-2 text-sm text-slate-300">
            {attempt === "baseline"
              ? "Don't worry if most of it is new: that's the point. You'll take the same check again before the final exam and see how far you've come."
              : sc?.baseline
                ? `Your baseline was ${sc.baseline.score}/${sc.baseline.total}. Same questions, new order. Let's see the difference.`
                : "You skipped the baseline, so this one stands on its own."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="skills-start"
              onClick={() => {
                setStarted(attempt);
                setPosition(0);
                setAnswers({});
              }}
              className="rounded-xl btn-signal px-5 py-3 "
            >
              Start: {items.length} questions
            </button>
            {attempt === "baseline" && (
              <Link href="/" onClick={() => skillsCheckActions.skipBaseline()} className="inline-flex min-h-6 items-center py-1 text-sm text-slate-300 underline-offset-2 hover:underline" data-testid="skills-skip">
                Skip for now
              </Link>
            )}
          </div>
        </section>
      </Shell>
    );
  }

  const item = items[position];
  const picked = answers[item.id];
  const last = position === items.length - 1;

  function next() {
    if (picked === undefined || !started) return;
    if (!last) {
      setPosition((p) => p + 1);
      return;
    }
    const solvedCount = Object.values(progress.tickets).filter((t) => t.solved).length;
    skillsCheckActions.finish(started, makeResult(check.items, answers, new Date(), solvedCount));
    setStarted(null);
  }

  return (
    <Shell>
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span className="font-semibold text-cyan-300">{attempt === "baseline" ? "Baseline" : "Final"} skills check</span>
        <span data-testid="skills-position">
          Question {position + 1} of {items.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Skills check progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={position}>
        <div className="h-full rounded-full bg-violet-400" style={{ width: `${(position / items.length) * 100}%` }} />
      </div>
      <Question
        key={`${attempt}:${item.id}`}
        item={item}
        seed={`skills:${attempt}:${item.id}`}
        picked={picked}
        onPick={(choice) => setAnswers((a) => ({ ...a, [item.id]: choice }))}
      />
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="skills-next"
          onClick={next}
          disabled={picked === undefined}
          className="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-8" data-testid="skills-check">
      {children}
    </div>
  );
}

/** Code with line numbers (spot the bug) or plain. */
function CodeBlock({ code, numbered = false }: { code: string; numbered?: boolean }) {
  return (
    <pre tabIndex={0} className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-relaxed text-slate-100">
      <code>
        {code.split("\n").map((line, i) => (
          <span key={i} className="block">
            {numbered && <span className="mr-3 inline-block w-5 text-right text-slate-500 select-none">{i + 1}</span>}
            {line || " "}
          </span>
        ))}
      </code>
    </pre>
  );
}

function Question({ item, seed, picked, onPick }: { item: SkillsCheckItem; seed: string; picked: number | undefined; onPick: (choice: number) => void }) {
  const order = shuffledOrder(item.choices.length, seed);
  const codeChoices = item.kind === "pick_answer" || item.choices.some((c) => c.includes("\n"));
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5" data-testid="skills-question" data-item-id={item.id}>
      <p className="text-sm font-semibold text-violet-200">{KIND_LABEL[item.kind]}</p>
      <h1 className="text-lg font-bold text-white">{item.prompt}</h1>
      {item.code && <CodeBlock code={item.code} numbered={item.kind === "spot_line"} />}
      <div role="radiogroup" aria-label="Your answer" className={codeChoices ? "grid gap-2 md:grid-cols-3" : "grid gap-2 sm:grid-cols-2"}>
        {order.map((ci, shown) => {
          const on = picked === ci;
          return (
            <button
              key={ci}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid="skills-choice"
              data-choice={ci}
              onClick={() => onPick(ci)}
              className={`min-w-0 rounded-xl border p-3 text-left text-sm transition ${
                on ? "border-violet-400 bg-violet-500/20 text-white" : "border-slate-700 bg-slate-950/40 text-slate-200 hover:border-cyan-400/60"
              }`}
            >
              {codeChoices ? (
                <>
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Answer {String.fromCharCode(65 + shown)}</span>
                  <pre className="overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre">{item.choices[ci]}</pre>
                </>
              ) : (
                <code className="font-mono break-words">{item.choices[ci]}</code>
              )}
            </button>
          );
        })}
        {/* Honest beats lucky: counts as wrong, but nobody has to guess. */}
        <button
          type="button"
          role="radio"
          aria-checked={picked === NOT_SURE}
          data-testid="skills-not-sure"
          data-choice={NOT_SURE}
          onClick={() => onPick(NOT_SURE)}
          className={`min-w-0 rounded-xl border border-dashed p-3 text-left text-sm transition ${codeChoices ? "md:col-span-3" : "sm:col-span-2"} ${
            picked === NOT_SURE ? "border-violet-400 bg-violet-500/20 text-white" : "border-slate-600 text-slate-300 hover:border-cyan-400/60"
          }`}
        >
          Not sure yet <span className="text-xs text-slate-400">(counts as wrong, and that&apos;s fine: it&apos;s honest)</span>
        </button>
      </div>
    </section>
  );
}

function Results({ check, sc, finalUnlocked, certificateReady }: { check: SkillsCheckContent; sc: SkillsCheckProgress | undefined; finalUnlocked: boolean; certificateReady: boolean }) {
  const line = comparisonText(sc);
  const final = sc?.final;
  return (
    <Shell>
      <section className="rounded-lg border border-rule bg-panel p-6" data-testid="skills-result">
        <p className="text-sm text-slate-300">Skills check</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl" data-testid="skills-comparison">
          {line ?? "Not taken yet"}
        </h1>
        {!final && sc?.baseline && (
          <p className="mt-2 font-semibold text-cyan-100" data-testid="skills-baseline-context">
            Most people starting out score {TYPICAL_BASELINE}. You&apos;ll take it again at the end.
          </p>
        )}
        <p className="mt-2 text-slate-300">
          {final
            ? "Here's every question with the right answer and why."
            : finalUnlocked
              ? "The final check is open."
              : "That's your starting point. The answers stay hidden until your final check (before the final exam), so the re-test is fair."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/" className="rounded-xl btn-signal px-5 py-3 text-center ">
            Back to the office
          </Link>
          {certificateReady && (
            <Link href="/certificate" data-testid="skills-certificate-link" className="rounded-xl border border-amber-300/60 bg-amber-400/10 px-5 py-3 font-semibold text-amber-100 hover:bg-amber-400/20">
              See your certificate
            </Link>
          )}
          {line && <ShareButton getText={() => skillsShareText(sc, currentSiteUrl())} testId="skills-share" label="Share my progress" />}
        </div>
      </section>

      {final && (
        <ol className="space-y-3" data-testid="skills-review">
          {check.items.map((item, i) => {
            const mine = final.answers[item.id];
            const right = mine === item.answer;
            const before = sc?.baseline?.answers[item.id];
            return (
              <li key={item.id} className={`rounded-2xl border p-4 ${right ? "border-emerald-500/30 bg-emerald-950/20" : "border-red-500/30 bg-red-950/20"}`}>
                <p className="text-sm font-semibold text-white">
                  <span role="img" aria-label={right ? "right" : "wrong"} className={right ? "text-pass" : "text-fail"}>
                <Icon name={right ? "check" : "cross"} className="mr-1" />
              </span>
              {i + 1}. {item.prompt}
                  {before !== undefined && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(baseline: {before === item.answer ? "right" : "wrong"})</span>
                  )}
                </p>
                {item.code && <div className="mt-2"><CodeBlock code={item.code} numbered={item.kind === "spot_line"} /></div>}
                <p className="mt-2 text-sm text-slate-200">
                  Right answer: <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono whitespace-pre-wrap text-emerald-200">{item.choices[item.answer]}</code>
                </p>
                {!right && mine === NOT_SURE && <p className="mt-1 text-sm text-slate-300">You answered: Not sure yet</p>}
                {!right && mine !== undefined && mine !== NOT_SURE && (
                  <p className="mt-1 text-sm text-slate-300">
                    You picked: <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono whitespace-pre-wrap text-red-200">{item.choices[mine]}</code>
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-300">
                  <InlineMarkdown text={item.explain} />
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Shell>
  );
}
