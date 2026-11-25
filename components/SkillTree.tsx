"use client";
// Skill tree: every concept in the roadmap, in order. Merged tickets unlock
// their concept; the lesson stays available to re-read any time.
import Link from "next/link";
import { useState } from "react";
import Markdown from "./Markdown";
import { conceptLabel } from "@/lib/content/concepts";
import { ticketProgress, useProgress } from "@/lib/progress/store";
import { useIsClient } from "@/lib/useIsClient";

export type Skill = {
  ticketId: string;
  ticketTitle: string;
  seasonTitle: string;
  concept: string;
  track: string;
  lesson: string | null;
};

const TRACK_COLOR: Record<string, string> = {
  foundations: "text-emerald-300 bg-emerald-500/10",
  building: "text-cyan-300 bg-cyan-500/10",
  debugging: "text-amber-300 bg-amber-500/10",
  reading: "text-violet-300 bg-violet-500/10",
  systems: "text-sky-300 bg-sky-500/10",
  ai: "text-pink-300 bg-pink-500/10",
};

export default function SkillTree({ skills }: { skills: Skill[] }) {
  const progress = useProgress();
  const isClient = useIsClient();
  const [open, setOpen] = useState<string | null>(null);
  const learned = isClient ? skills.filter((s) => ticketProgress(progress, s.ticketId).solved).length : 0;
  // Grouped by floor (season), numbered across the whole roadmap.
  const groups: { title: string; items: { skill: Skill; n: number }[] }[] = [];
  skills.forEach((skill, i) => {
    const last = groups[groups.length - 1];
    if (last?.title === skill.seasonTitle) last.items.push({ skill, n: i + 1 });
    else groups.push({ title: skill.seasonTitle, items: [{ skill, n: i + 1 }] });
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-white">🌳 Skill tree</h1>
      <p className="mt-2 text-slate-300">
        Every ticket teaches exactly one new idea. Here&apos;s everything you&apos;ve learned so far ({learned}/{skills.length}),
        with the lessons to re-read whenever you like.
      </p>
      <div className="mt-8 space-y-8" data-testid="skill-tree">
        {groups.map((g, floor) => {
          const groupDone = isClient ? g.items.filter(({ skill }) => ticketProgress(progress, skill.ticketId).solved).length : 0;
          return (
            <section key={g.title} aria-labelledby={`skills-floor-${floor + 1}`}>
              <h2 id={`skills-floor-${floor + 1}`} className="mb-3 flex flex-wrap items-baseline gap-x-3 text-lg font-bold text-white">
                🏢 Floor {floor + 1} · {g.title}
                <span className="text-sm font-normal text-slate-300">{groupDone}/{g.items.length} learned</span>
              </h2>
              <ol className="relative space-y-3 border-l-2 border-slate-800 pl-6">
                {g.items.map(({ skill: s, n }) => {
                  const done = isClient && ticketProgress(progress, s.ticketId).solved;
                  const isOpen = open === s.ticketId;
                  return (
                    <li key={s.ticketId} className="relative">
                      <span
                        className={`absolute top-3 -left-[33px] grid h-4 w-4 place-items-center rounded-full border-2 ${
                          done ? "border-emerald-400 bg-emerald-400" : "border-slate-600 bg-slate-950"
                        }`}
                      />
                      <div className={`rounded-xl border p-3 ${done ? "border-slate-700 bg-slate-900/70" : "border-slate-800 bg-slate-900/30"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-300">{n}</span>
                          <span className={`font-semibold ${done ? "text-white" : "text-slate-200"}`}>{conceptLabel(s.concept)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${TRACK_COLOR[s.track] ?? "bg-slate-800 text-slate-300"}`}>{s.track}</span>
                          <span className="ml-auto text-xs text-slate-300">{done ? "✅ learned" : <><span aria-hidden>🔒</span><span className="sr-only">not learned yet</span></>}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-300">
                          Ticket:{" "}
                          <Link href={`/ticket/${s.ticketId}`} className="inline-block min-h-6 py-0.5 text-cyan-300 hover:underline">
                            {s.ticketTitle}
                          </Link>
                        </div>
                        {done && s.lesson && (
                          <button onClick={() => setOpen(isOpen ? null : s.ticketId)} className="mt-1 inline-block min-h-6 py-1 text-xs text-violet-300 hover:underline">
                            {isOpen ? "Hide lesson" : "📘 Re-read the lesson"}
                          </button>
                        )}
                        {isOpen && s.lesson && <Markdown text={s.lesson} className="mt-3 text-sm text-slate-300" />}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
