"use client";
// "🤖 Human-in-the-loop score": how well the learner checks Byte's work.
// Shown on the HQ and on the leaderboard page.
import { currentSiteUrl } from "@/lib/basePath";
import { correctSeen, hitlAccuracy, hitlSummary, wrongSeen, type HitlScore } from "@/lib/game/byte";
import { hitlShareText } from "@/lib/game/share";
import ShareButton from "./ShareButton";

export default function HumanInTheLoop({ score, compact = false }: { score: HitlScore; compact?: boolean }) {
  const summary = hitlSummary(score);
  const accuracy = hitlAccuracy(score);
  const stats = [
    { label: "Byte bugs caught", value: `${score.caught}/${wrongSeen(score)}`, testId: "hitl-caught" },
    { label: "Waved through", value: String(score.wavedThrough), testId: "hitl-waved" },
    { label: "Trusted correctly", value: `${score.trusted}/${correctSeen(score)}`, testId: "hitl-trusted" },
    { label: "Best prompts first", value: `${score.bestPrompts}/${score.promptsTried}`, testId: "hitl-prompts" },
  ];
  return (
    <section data-testid="hitl-score" className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/60 to-slate-900/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-white">🤖 Human-in-the-loop score</h2>
        {accuracy !== null && (
          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-sm font-semibold text-violet-100" data-testid="hitl-accuracy">
            {Math.round(accuracy * 100)}% good calls
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-300" data-testid="hitl-summary">
        {summary || "Byte will start suggesting code in your first week. Catch its mistakes, trust it when it's right, and give it good prompts."}
      </p>
      {!compact && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
              <div className="text-[11px] tracking-wide text-slate-400 uppercase">{s.label}</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-white" data-testid={s.testId}>{s.value}</div>
            </li>
          ))}
        </ul>
      )}
      {score.practice > 0 && (
        <p className="mt-2 text-xs text-slate-400" data-testid="hitl-practice">
          Your first {score.practice === 1 ? "Byte call was a practice round" : `${score.practice} Byte calls were practice rounds`} and
          {score.practice === 1 ? " doesn't" : " don't"} count here.
        </p>
      )}
      {score.pending > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {score.pending} of Byte&apos;s suggestion{score.pending === 1 ? " is" : "s are"} applied but not tested yet.
        </p>
      )}
      {wrongSeen(score) > 0 && (
        <div className="mt-3">
          <ShareButton getText={() => hitlShareText(score.caught, wrongSeen(score), currentSiteUrl())} />
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        Byte writes fast and always sounds sure. Your job is to be the human in the loop.
      </p>
    </section>
  );
}
