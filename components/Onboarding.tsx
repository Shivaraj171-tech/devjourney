"use client";
// First-visit intro: how a day at Orbit Orders works, in four steps.
import { actions } from "@/lib/progress/store";

const STEPS = [
  { icon: "📨", title: "Read the ticket", text: "A teammate explains what's broken and why it matters to customers." },
  { icon: "📘", title: "Learn the idea", text: "Each ticket teaches one new concept in a 2-minute lesson. Never two at once." },
  { icon: "▶️", title: "Fix the code & run the checks", text: "Edit the real app's code right in your browser. Run the checks as often as you like: no lives, no penalties." },
  { icon: "🎉", title: "Merge, earn XP, level up", text: "Green checks = PR merged. Stuck? Hints cost a little XP. A quick quiz earns bonus XP." },
];

export default function Onboarding() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" data-testid="onboarding">
      <div className="w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-900 p-6 shadow-2xl">
        <p className="text-sm font-semibold tracking-widest text-cyan-300 uppercase">Day 1 · Orbit Orders</p>
        <h2 className="mt-1 text-2xl font-bold text-white">You&apos;re hired! 🎉</h2>
        <p className="mt-2 text-slate-300">
          You just joined a small food-delivery startup as a junior developer. You&apos;ll learn to code by working on
          the real app, one 10-minute ticket at a time.
        </p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-lg">{s.icon}</span>
              <div>
                <div className="font-semibold text-white">
                  {i + 1}. {s.title}
                </div>
                <div className="text-sm text-slate-400">{s.text}</div>
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={() => actions.finishOnboarding()}
          className="mt-6 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Let&apos;s go →
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">No sign-up. Your progress is saved in this browser.</p>
      </div>
    </div>
  );
}
