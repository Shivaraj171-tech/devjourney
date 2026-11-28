"use client";
// "Human-in-the-loop score": how well the learner checks Byte's work.
// Shown on the HQ and on the leaderboard page.
import { currentSiteUrl } from "@/lib/basePath";
import { correctSeen, hitlAccuracy, hitlSummary, wrongSeen, type HitlScore } from "@/lib/game/byte";
import { hitlShareText } from "@/lib/game/share";
import ShareButton from "./ShareButton";
import Icon from "./icons/Icon";

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
    <section data-testid="hitl-score" className="rounded-lg border border-byte/40 bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">
          <Icon name="byte" className="mr-2 h-5 w-5 text-byte" />
          Human-in-the-loop score
        </h2>
        {accuracy !== null && (
          <span className="text-sm font-semibold text-byte" data-testid="hitl-accuracy">
            {Math.round(accuracy * 100)}% good calls
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-300" data-testid="hitl-summary">
        {summary || "Byte will start suggesting code in your first week. Catch its mistakes, trust it when it's right, and give it good prompts."}
      </p>
      {!compact && (
        // The catch rate leads; the other three are a plain row of figures under it.
        <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {stats.map((s, i) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <dd className={`order-1 font-bold text-ink tabular-nums ${i === 0 ? "text-2xl" : "text-base"}`} data-testid={s.testId}>{s.value}</dd>
              <dt className="order-2 text-sm text-slate-300">{s.label}</dt>
            </div>
          ))}
        </dl>
      )}
      {score.practice > 0 && (
        <p className="mt-2 text-sm text-slate-300" data-testid="hitl-practice">
          Your first {score.practice === 1 ? "Byte call was a practice round" : `${score.practice} Byte calls were practice rounds`} and
          {score.practice === 1 ? " doesn't" : " don't"} count here.
        </p>
      )}
      {score.pending > 0 && (
        <p className="mt-2 text-sm text-slate-300">
          {score.pending} of Byte&apos;s suggestion{score.pending === 1 ? " is" : "s are"} applied but not tested yet.
        </p>
      )}
      {wrongSeen(score) > 0 && (
        <div className="mt-3">
          <ShareButton getText={() => hitlShareText(score.caught, wrongSeen(score), currentSiteUrl())} />
        </div>
      )}
      <p className="mt-2 text-sm text-slate-300">
        Byte writes fast and always sounds sure. Your job is to be the human in the loop.
      </p>
    </section>
  );
}
