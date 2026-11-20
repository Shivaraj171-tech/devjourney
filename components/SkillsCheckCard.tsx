"use client";
// HQ: a small "Skills check" card. Offers the baseline after onboarding (with
// "Skip for now"), shows the baseline score, offers the final check once the
// final exam is open, and then shows "Baseline 5/12 → Final 11/12".
import Link from "next/link";
import { comparisonText, skillsCardState, type SkillsCheckProgress } from "@/lib/game/skillsCheck";
import { skillsCheckActions } from "@/lib/progress/store";

type Props = { skillsCheck: SkillsCheckProgress | undefined; finalUnlocked: boolean; certificateReady: boolean };

export default function SkillsCheckCard({ skillsCheck, finalUnlocked, certificateReady }: Props) {
  const state = skillsCardState(skillsCheck, finalUnlocked);
  if (state === "hidden") return null;
  const line = comparisonText(skillsCheck);

  return (
    <section
      data-testid="skills-card"
      data-state={state}
      aria-labelledby="skills-card-title"
      className="flex flex-col gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <h2 id="skills-card-title" className="font-bold text-white">
          📝 Skills check{line ? <span className="ml-2 font-mono text-cyan-200" data-testid="skills-card-score">{line}</span> : null}
        </h2>
        <p className="mt-0.5 text-sm text-slate-300">
          {state === "offer-baseline" && "12 quick questions (about 6 minutes) to see where you're starting from. You'll retake it before the final exam."}
          {state === "baseline-done" && "Your starting point is saved. You'll take the same check again before the final exam."}
          {state === "offer-final" && "The final exam is open. Take the final skills check and see how far you've come."}
          {state === "done" && (certificateReady ? "Final exam passed. Your certificate is ready." : "Finish the final exam's tickets to earn your certificate.")}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {(state === "offer-baseline" || state === "offer-final") && (
          <Link href="/skills-check" data-testid="skills-card-start" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            {state === "offer-baseline" ? "Take the check →" : "Take the final check →"}
          </Link>
        )}
        {state === "offer-baseline" && (
          <button
            type="button"
            data-testid="skills-card-skip"
            onClick={() => skillsCheckActions.skipBaseline()}
            className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Skip for now
          </button>
        )}
        {state === "done" && certificateReady && (
          <Link href="/certificate" data-testid="skills-card-certificate" className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
            🎓 Certificate →
          </Link>
        )}
        {(state === "baseline-done" || state === "done") && (
          <Link href="/skills-check" className="rounded-xl px-3 py-2 text-sm text-cyan-200 hover:bg-slate-800">
            Details
          </Link>
        )}
      </div>
    </section>
  );
}
