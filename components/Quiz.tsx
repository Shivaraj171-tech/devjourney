"use client";
import { shuffledOrder } from "@/lib/game/shuffle";
import { useState } from "react";
import type { Question } from "@/lib/content/types";
import { QUIZ_XP_PER_CORRECT } from "@/lib/game/rules";
import { InlineMarkdown } from "./Markdown";

type Props = {
  questions: Question[];
  /** Seed for the stable choice order (e.g. the ticket id). */
  seed?: string;
  /** First choice picked per question (persisted), used to restore state. */
  firstPicks: (number | null)[];
  done: boolean;
  onAnswer: (index: number, choice: number) => void;
  /** Called once when every question has been answered correctly. */
  onComplete: (correctFirstTry: number) => void;
  intro?: string;
};

export default function Quiz({ questions, firstPicks, done, onAnswer, onComplete, intro, seed = "" }: Props) {
  // Which questions are answered correctly (in this visit, or all if already done).
  const [correct, setCorrect] = useState<Set<number>>(() =>
    done ? new Set(questions.map((_, i) => i)) : new Set(),
  );
  // Last choice clicked per question, to show feedback.
  const [picked, setPicked] = useState<Record<number, number>>(() =>
    done ? Object.fromEntries(questions.map((q, i) => [i, q.answer])) : {},
  );

  function choose(qi: number, choice: number) {
    if (correct.has(qi)) return;
    onAnswer(qi, choice);
    setPicked((p) => ({ ...p, [qi]: choice }));
    if (choice === questions[qi].answer) {
      const next = new Set(correct).add(qi);
      setCorrect(next);
      if (next.size === questions.length && !done) {
        const picks = questions.map((_, i) => (i === qi && firstPicks[i] == null ? choice : firstPicks[i]));
        const firstTry = questions.filter((q, i) => picks[i] === q.answer).length;
        onComplete(firstTry);
      }
    }
  }

  const firstTryCount = questions.filter((q, i) => firstPicks[i] === q.answer).length;

  return (
    <div className="space-y-4">
      {intro && <p className="text-sm text-slate-400">{intro}</p>}
      {questions.map((q, qi) => {
        const isCorrect = correct.has(qi);
        const last = picked[qi];
        return (
          <div key={qi} data-testid={`question-${qi}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="mb-2 text-sm font-medium text-white">
              {qi + 1}. <InlineMarkdown text={q.prompt} />
            </p>
            <div className="space-y-1.5">
              {shuffledOrder(q.choices.length, `${seed}:${qi}`).map((ci) => {
                const c = q.choices[ci];
                const state =
                  last === ci ? (ci === q.answer ? "right" : "wrong") : isCorrect && ci === q.answer ? "right" : "idle";
                return (
                  <button
                    key={ci}
                    onClick={() => choose(qi, ci)}
                    disabled={isCorrect}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      state === "right"
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                        : state === "wrong"
                          ? "border-red-400/60 bg-red-500/10 text-red-100"
                          : "border-slate-700 text-slate-200 hover:border-cyan-400/60 hover:bg-slate-800"
                    }`}
                  >
                    <InlineMarkdown text={c} />
                  </button>
                );
              })}
            </div>
            {last !== undefined && last !== q.answer && !isCorrect && (
              <p className="mt-2 text-xs text-red-300">Not quite. Have another look at the code and try again.</p>
            )}
            {isCorrect && (
              <p className="mt-2 text-xs text-emerald-300">
                ✔ <InlineMarkdown text={q.explain} />
              </p>
            )}
          </div>
        );
      })}
      {done && (
        <p data-testid="quiz-done" className="text-sm text-emerald-300">
          Quiz complete: {firstTryCount}/{questions.length} right on the first try (+{firstTryCount * QUIZ_XP_PER_CORRECT} XP).
        </p>
      )}
    </div>
  );
}
