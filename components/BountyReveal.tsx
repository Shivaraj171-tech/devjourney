"use client";
// Bug Bounty tickets (side quests): before solving, a banner says it's a mystery
// bug (no label, no lesson); after solving it reveals the kind of bug and links
// back to the lesson that taught it (lib/game/bounty.ts). The lesson link is a plain
// <a> (a full page load), so the lesson page sees #lesson and opens it.
import { withBase } from "@/lib/basePath";
import type { BountyInfo } from "@/lib/content/types";
import { lessonHref, revealText } from "@/lib/game/bounty";

export default function BountyReveal({ bounty, solved, compact = false }: { bounty: BountyInfo; solved: boolean; compact?: boolean }) {
  if (!solved) {
    return (
      <p data-testid="bounty-banner" className="mt-2 rounded-lg border border-lime-400/40 bg-lime-400/10 px-3 py-2 text-xs text-lime-100">
        <b>🐞 Bug Bounty.</b> A mystery bug: no lesson and no label. Work out what kind of bug it is, then fix it. Hints are allowed.
      </p>
    );
  }
  return (
    <div
      data-testid="bounty-reveal"
      className={`${compact ? "mt-3 text-left" : "mt-2"} rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50`}
    >
      <p>
        🔎 <b>{revealText(bounty.bugKind)}</b>
      </p>
      {bounty.requires && (
        <p className="mt-1 text-xs text-slate-200">
          You first met it in <i>{bounty.requires.title}</i>.{" "}
          <a href={withBase(lessonHref(bounty.requires.id))} data-testid="bounty-lesson-link" className="font-semibold text-cyan-300 hover:underline">
            📘 Revisit the lesson →
          </a>
        </p>
      )}
    </div>
  );
}
