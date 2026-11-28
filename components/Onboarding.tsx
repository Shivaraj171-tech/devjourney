"use client";
// First-visit intro: how a day at Orbit Orders works, in four steps.
// A proper modal dialog: focus starts on the CTA, Tab stays inside, and Esc
// closes it (the same as "Let's go").
import { useEffect, useRef } from "react";
import { actions } from "@/lib/progress/store";

const STEPS = [
  { title: "Read the ticket", text: "A teammate explains what's broken and why it matters to customers." },
  { title: "Learn the idea", text: "Each ticket brings one new idea, explained in a 2-minute lesson: one new idea at a time, built on what you already know." },
  { title: "Fix the code & run the checks", text: "Edit the real app's code right in your browser. Run the checks as often as you like: no lives, no penalties." },
  { title: "Merge, earn XP, level up", text: "When every check is green, your change is accepted into the app (developers call this \"merging a pull request\", or PR). Stuck? Each hint costs 20 XP of the ticket's reward (at most 60%). A quick quiz earns bonus XP." },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Onboarding() {
  const dialog = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    cta.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        actions.finishOnboarding();
        return;
      }
      if (e.key !== "Tab" || !dialog.current) return;
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = dialog.current.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Back where focus was; on a first visit that is nothing, so go to the one next step:
      // the ticket slip's Start button (or the page content).
      if (before && before !== document.body && document.contains(before)) before.focus();
      else requestAnimationFrame(() => (document.querySelector<HTMLElement>('[data-testid="continue"]') ?? document.querySelector<HTMLElement>("main#main"))?.focus());
    };
  }, []);

  return (
    <div
      ref={dialog}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      data-testid="onboarding"
    >
      <div className="w-full max-w-lg rounded-lg border border-rule bg-panel p-6 shadow-2xl">
        <p className="text-sm font-semibold text-slate-300">Day 1 at Orbit Orders</p>
        <h2 id="onboarding-title" className="mt-1 text-2xl font-bold text-white">You&apos;re hired.</h2>
        <p className="mt-2 text-slate-300">
          You just joined a small food-delivery startup as a junior developer. Your teammate Byte is an AI that writes code
          fast but not always right. You&apos;ll learn to code by working on the real app, one short ticket at a time, and
          learn to check, debug and fix what the AI writes.
        </p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              {/* A real sequence, so it is numbered: the number on a plate, like the floors. */}
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-slate-500 font-display text-lg font-bold text-ink">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold text-white">
                  <span className="sr-only">{i + 1}. </span>
                  {s.title}
                </div>
                <div className="text-sm text-slate-300">{s.text}</div>
              </div>
            </li>
          ))}
        </ol>
        <button
          ref={cta}
          type="button"
          onClick={() => actions.finishOnboarding()}
          className="btn-signal mt-6 w-full rounded-xl py-3"
        >
          Let&apos;s go
        </button>
        <p className="mt-2 text-center text-xs text-slate-300">No sign-up. Your progress is saved in this browser.</p>
      </div>
    </div>
  );
}
