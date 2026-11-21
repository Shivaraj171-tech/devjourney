"use client";
// "My coding profile" (/profile/): what the learner's own work says about them, with
// the evidence for every line (lib/game/profile.ts). Strengths, 2-3 focus areas with
// practice made for them, habits, and how it works. Computed in the browser only.
import Link from "next/link";
import { practiceFor, masteryWords, type ConceptMastery, type Habit, type PracticeItem, type ProfileContent } from "@/lib/game/profile";
import { ticketProgress, useProgress } from "@/lib/progress/store";
import { useCodingProfile } from "@/lib/useCodingProfile";
import { useIsClient } from "@/lib/useIsClient";

export default function CodingProfile({ content }: { content: ProfileContent }) {
  const progress = useProgress();
  const isClient = useIsClient();
  const profile = useCodingProfile(progress, content, isClient ? new Date() : null);

  if (!isClient || !profile) return <div className="p-8 text-center text-slate-400">Opening your profile…</div>;

  const isSolved = (id: string) => ticketProgress(progress, id).solved;
  const practice = practiceFor(
    profile.focus.map((f) => f.concept),
    content,
    isSolved,
    (id, key) => !!ticketProgress(progress, id).formats?.[key]?.done,
  );
  const others = profile.concepts.filter((c) => !profile.focus.includes(c) && !profile.strengths.includes(c));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8" data-testid="profile-page">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">🧭 My coding profile</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Built from what your code actually did: test runs, the errors they hit, hints, warm-ups, practice and your calls on Byte&apos;s code.
          Every line says why. It&apos;s only for you, and it never changes your XP.
        </p>
      </header>

      {profile.empty ? (
        <EmptyState />
      ) : (
        <>
          <section aria-labelledby="focus-title" className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 sm:p-5" data-testid="profile-focus">
            <h2 id="focus-title" className="text-lg font-bold text-white">
              🎯 Focus areas
            </h2>
            {profile.focus.length === 0 ? (
              <p className="mt-1 text-sm text-slate-300" data-testid="profile-no-focus">
                Nothing stands out yet. Keep going: after a few more tickets and warm-ups, this is where practice will pay off most.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-300">Where a little practice pays off most right now. Everyone has these; they move as you practise.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {profile.focus.map((c) => (
                    <FocusCard key={c.concept} concept={c} practice={practice[c.concept] ?? []} />
                  ))}
                </div>
              </>
            )}
          </section>

          {profile.strengths.length > 0 && (
            <section aria-labelledby="strengths-title" className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 sm:p-5" data-testid="profile-strengths">
              <h2 id="strengths-title" className="text-lg font-bold text-white">
                💪 Strengths
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {profile.strengths.map((c) => (
                  <li key={c.concept} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3" data-testid={`strength-${c.concept}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-white">{c.label}</span>
                      <span className="text-xs text-emerald-200">{masteryWords(c.mastery)}</span>
                    </div>
                    <MasteryBar concept={c} />
                    <p className="mt-1.5 text-xs text-slate-300">Because: {c.because.join("; ")}.</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="habits-title" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5" data-testid="profile-habits">
            <h2 id="habits-title" className="text-lg font-bold text-white">
              🧩 Habits
            </h2>
            {profile.habits.length === 0 ? (
              <p className="mt-1 text-sm text-slate-300">No clear habits yet. They show up after a few tickets with test runs.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {profile.habits.map((h) => (
                  <HabitRow key={h.id} habit={h} />
                ))}
              </ul>
            )}
          </section>

          {others.length > 0 && (
            <details className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5" data-testid="profile-all">
              <summary className="cursor-pointer text-sm font-semibold text-white">Everything else so far ({others.length} concepts)</summary>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {others.map((c) => (
                  <li key={c.concept} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{c.label}</span>
                      <span className="text-xs text-slate-300">{c.confidence < 1.5 ? "not much evidence yet" : masteryWords(c.mastery)}</span>
                    </div>
                    <MasteryBar concept={c} />
                    <p className="mt-1.5 text-xs text-slate-400">{c.because.join("; ")}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <HowItWorks />
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-slate-300" data-testid="profile-empty">
      <h2 className="text-lg font-bold text-white">Nothing here yet, and that&apos;s fine</h2>
      <p className="mt-2 max-w-2xl text-sm">
        Your profile fills in as you work: run the tests on a ticket, answer a warm-up, make a call on Byte&apos;s code. After a ticket or two you&apos;ll see
        what you&apos;re good at, what to practise next, and practice picked for you.
      </p>
      <Link href="/" className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
        Go to the office →
      </Link>
    </section>
  );
}

function MasteryBar({ concept }: { concept: ConceptMastery }) {
  const pct = Math.round(concept.mastery * 100);
  const color = concept.mastery >= 0.75 ? "from-emerald-500 to-emerald-300" : concept.mastery >= 0.55 ? "from-cyan-500 to-cyan-300" : "from-amber-500 to-amber-300";
  return (
    <div
      role="meter"
      aria-label={`${concept.label}: ${masteryWords(concept.mastery)}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"
    >
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(4, pct)}%` }} />
    </div>
  );
}

function FocusCard({ concept, practice }: { concept: ConceptMastery; practice: PracticeItem[] }) {
  const negatives = concept.lines.filter((l) => !l.positive).slice(0, 4);
  const positives = concept.lines.filter((l) => l.positive).slice(0, 2);
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-slate-700 bg-slate-950/60 p-3" data-testid={`focus-${concept.concept}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-white">{concept.label}</h3>
        <span className="text-xs text-amber-200">{masteryWords(concept.mastery)}</span>
      </div>
      <MasteryBar concept={concept} />
      <p className="mt-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Because</p>
      <ul className="mt-1 space-y-0.5 text-sm text-slate-200" data-testid="focus-evidence">
        {negatives.map((l) => (
          <li key={l.text} className="flex gap-1.5">
            <span aria-hidden className="text-amber-300">•</span>
            <span className="min-w-0">{l.text}</span>
          </li>
        ))}
        {positives.map((l) => (
          <li key={l.text} className="flex gap-1.5 text-slate-300">
            <span aria-hidden className="text-emerald-300">+</span>
            <span className="min-w-0">{l.text}</span>
          </li>
        ))}
      </ul>
      {practice.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Practice made for you</p>
          <ul className="mt-1 space-y-1.5" data-testid="profile-practice">
            {practice.map((p) => (
              <li key={`${p.kind}:${p.title}`}>
                <Link
                  href={p.href}
                  data-testid={`practice-${p.kind}`}
                  className="block rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm text-cyan-200 hover:border-cyan-400/60 hover:bg-slate-800"
                >
                  <span className="block font-semibold break-words">{p.title}</span>
                  <span className="block text-xs text-slate-400">{p.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

const HABIT_ICON: Record<Habit["tone"], string> = { strength: "💪", tip: "💡", neutral: "👀" };

function HabitRow({ habit }: { habit: Habit }) {
  return (
    <li className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3" data-testid={`habit-${habit.id}`} data-tone={habit.tone}>
      <span aria-hidden className="text-xl">{HABIT_ICON[habit.tone]}</span>
      <div className="min-w-0">
        <div className="font-semibold text-white">
          {habit.label}
          <span className="sr-only"> ({habit.tone === "strength" ? "a strength" : habit.tone === "tip" ? "something to try" : "just so you know"})</span>
        </div>
        <p className="text-sm text-slate-300">Because: {habit.because}</p>
        {habit.tip && <p className="mt-1 text-sm text-cyan-100">Try: {habit.tip}</p>}
      </div>
    </li>
  );
}

function HowItWorks() {
  return (
    <details className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 sm:p-5" data-testid="profile-how">
      <summary className="cursor-pointer font-semibold text-white">🔒 How this works · nothing leaves your browser</summary>
      <div className="mt-2 space-y-2">
        <p>
          Everything here is worked out on this device from your saved progress. No AI, no server, no account: nothing is uploaded, and your code itself is never
          stored for this, only which checks failed and the kind of error (KeyError, a timeout…).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b className="text-white">Concepts:</b> passing on the first run, runs needed, hints, quiz first tries, warm-ups, practice tasks and Byte calls all count,
            and recent work counts most. Errors point at concepts too (a KeyError at dictionaries, a crash on None at None, a failing edge case at loops).
          </li>
          <li>
            <b className="text-white">Habits:</b> spotted from patterns, like running the same code twice or editing the line an error pointed to.
          </li>
          <li>
            <b className="text-white">What it changes:</b> your daily warm-ups and the Bug Bounty board pick your focus areas first, and a ticket may offer help
            after a few tries. Never a penalty.
          </li>
        </ul>
        <p>
          To start over, reset your progress in <Link href="/settings" className="text-cyan-300 hover:underline">Settings</Link>.
        </p>
      </div>
    </details>
  );
}
