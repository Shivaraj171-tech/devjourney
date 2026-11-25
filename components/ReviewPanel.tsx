"use client";
// Code review tickets: read a pull request, click the lines that have problems,
// then submit the review. Wrong flags are "false alarms" and cost a little XP.
import { useMemo, useState, type ReactNode } from "react";
import Markdown from "./Markdown";
import type { Review, Ticket } from "@/lib/content/types";
import { checkReview, FALSE_ALARM_COST, reviewXp, type TicketXp } from "@/lib/game/rules";
import { reviewActions, type TicketProgress } from "@/lib/progress/store";
import { changedLines, removedLines } from "@/lib/review/diff";

type Props = {
  ticket: Ticket & { review: Review };
  tp: TicketProgress;
  onSolved: (xp: TicketXp) => void;
  /** Extra buttons for the review bar, e.g. the hints button. Rendered at the right end. */
  actions?: ReactNode;
};

export default function ReviewPanel({ ticket, tp, onSolved, actions }: Props) {
  const review = ticket.review;
  const prPaths = review.files.map((f) => f.path);
  const codebasePaths = Object.keys(ticket.starter).filter(
    (p) => !prPaths.includes(p) && (!p.endsWith("__init__.py") || ticket.starter[p].trim()),
  );
  const [activeFile, setActiveFile] = useState(prPaths[0]);
  const prFile = review.files.find((f) => f.path === activeFile);

  const flags = tp.reviewFlags ?? [];
  const last = tp.reviewSubmitted ? checkReview(tp.reviewSubmitted, review.issues) : null;
  const solved = tp.solved;
  const total = review.issues.length;
  const found = solved ? total : (last?.found.length ?? 0);

  function submit() {
    const check = checkReview(flags, review.issues);
    const totalFalseAlarms = new Set([...(tp.reviewFalseAlarms ?? []), ...check.falseAlarms]).size;
    reviewActions.submit(ticket.id, check.falseAlarms, check.passed, (fa, hints) => reviewXp(ticket.level, fa, hints).total);
    if (check.passed && !solved) onSolved(reviewXp(ticket.level, totalFalseAlarms, tp.hintsUsed));
  }

  return (
    <section className="flex min-h-[600px] min-w-0 flex-1 flex-col gap-3 lg:min-h-0" data-testid="review-panel">
      {/* ---------- PR header ---------- */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">⇄ Open pull request</span>
          <span className="text-slate-400">
            <b className="text-slate-200">{review.author}</b> wants to merge {review.files.length} file{review.files.length === 1 ? "" : "s"} into{" "}
            <code className="text-cyan-300">main</code>
          </span>
        </div>
        <h2 className="mt-2 text-lg font-bold text-white">{review.title}</h2>
        <Markdown text={review.description} className="mt-1 text-sm text-slate-300" />
      </div>

      {/* ---------- files ---------- */}
      <div className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-editor">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-2">
          {prPaths.map((path) => (
            <FileTab key={path} path={path} active={activeFile === path} onClick={() => setActiveFile(path)}>
              <span className={path in ticket.starter ? "text-amber-300" : "text-emerald-300"}>
                {path in ticket.starter ? "M" : "A"}
              </span>{" "}
              {path}
            </FileTab>
          ))}
          <span className="shrink-0 px-2 text-[11px] tracking-wide text-slate-400 uppercase">codebase</span>
          {codebasePaths.map((path) => (
            <FileTab key={path} path={path} active={activeFile === path} onClick={() => setActiveFile(path)} muted>
              🔒 {path}
            </FileTab>
          ))}
        </div>
        {prFile && (
          <div
            data-testid="review-instructions"
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm ${
              solved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-violet-500/30 bg-violet-500/10 text-violet-50"
            }`}
          >
            <span className="font-semibold">
              {solved ? "✅ Review finished. These are the problems that were in this PR." : "👆 Tap a line to flag it 🚩"}
            </span>
            <span className="rounded-full bg-slate-950/60 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {found}/{total} found
            </span>
            {!solved && (
              <span className="text-xs text-slate-300">
                Tap again to unflag.{prFile.path in ticket.starter ? "" : " Every line in this file is new."}
              </span>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          {prFile ? (
            <PrFileView
              path={prFile.path}
              text={prFile.text}
              before={ticket.starter[prFile.path]}
              review={review}
              flags={flags}
              last={last}
              solved={solved}
              onToggle={(key) => reviewActions.toggleFlag(ticket.id, key)}
            />
          ) : (
            <CodeLines text={ticket.starter[activeFile] ?? ""} />
          )}
        </div>
        {prFile && !solved && (
          <div className="border-t border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
            Lines marked <span className="text-emerald-300">+</span> are new in this PR
            {prFile.path in ticket.starter && removedLines(ticket.starter[prFile.path], prFile.text).size > 0 ? (
              <>; red <span className="text-red-300">−</span> lines were removed.</>
            ) : (
              "."
            )}
          </div>
        )}
      </div>

      {/* ---------- submit + verdict ---------- */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Your review</div>
          <span className="text-sm text-slate-300" data-testid="flag-count">
            🚩 {flags.length} line{flags.length === 1 ? "" : "s"} flagged
          </span>
          {!solved && (
            <button
              data-testid="submit-review"
              onClick={submit}
              disabled={flags.length === 0}
              className="ml-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Submit review
            </button>
          )}
          {actions && <div className={solved ? "ml-auto" : ""}>{actions}</div>}
        </div>
        <Verdict review={review} last={last} solved={solved} onJump={setActiveFile} />
      </div>
    </section>
  );
}

function FileTab({ path, active, muted, onClick, children }: { path: string; active: boolean; muted?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={muted ? `${path} (unchanged, for context)` : `${path} (changed in this PR)`}
      className={`shrink-0 border-b-2 px-3 py-2 font-mono text-xs ${
        active ? "border-cyan-400 text-white" : `border-transparent ${muted ? "text-slate-400" : "text-slate-300"} hover:text-white`
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Long lines wrap instead of running off the right edge (on a phone the bug
 * itself was cut off). Wrapped parts get a hanging indent so they read as one line.
 */
const WRAP = "min-w-0 flex-1 pr-4 pl-[4ch] -indent-[4ch] whitespace-pre-wrap [overflow-wrap:anywhere]";

/** File text split into lines, without the empty "line" after a final newline. */
function splitLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Plain read-only, line-numbered code (codebase files in a review). */
function CodeLines({ text }: { text: string }) {
  return (
    <pre className="py-3 font-mono text-[13px] leading-6 text-slate-300">
      {splitLines(text).map((line, i) => (
        <div key={i} className="flex">
          <span className="w-12 shrink-0 pr-3 text-right text-slate-400 select-none">{i + 1}</span>
          <span className={WRAP}>{line}</span>
        </div>
      ))}
    </pre>
  );
}

type ViewProps = {
  path: string;
  text: string;
  before: string | undefined;
  review: Review;
  flags: string[];
  last: ReturnType<typeof checkReview> | null;
  solved: boolean;
  onToggle: (key: string) => void;
};

/** A PR file: every line is a toggle button for flagging it. */
function PrFileView({ path, text, before, review, flags, last, solved, onToggle }: ViewProps) {
  const added = useMemo(() => changedLines(before, text), [before, text]);
  // A brand-new file is all "+": tinting every line green would only be noise.
  const isNewFile = before === undefined;
  const removed = useMemo(() => removedLines(before, text), [before, text]);
  const lines = splitLines(text);
  const issueAt = (n: number) =>
    review.issues.findIndex((i) => i.file === path && (i.line === n || i.alsoLines.includes(n)));

  return (
    <div className="py-3 font-mono text-xs leading-6 sm:text-[13px]" data-testid="pr-file">
      {lines.map((line, i) => {
        const n = i + 1;
        const key = `${path}:${n}`;
        const blank = line.trim() === ""; // nothing to flag on an empty line
        const flagged = flags.includes(key);
        const issue = issueAt(n);
        const revealed = issue >= 0 && (solved || (last?.found.includes(issue) ?? false));
        const falseAlarm = flagged && !solved && (last?.falseAlarms.includes(key) ?? false);
        const explainHere = revealed && review.issues[issue].line === n;
        const tone = revealed
          ? "bg-emerald-500/15"
          : falseAlarm
            ? "bg-amber-500/15"
            : flagged
              ? "bg-red-500/20"
              : added.has(n) && !isNewFile
                ? "bg-emerald-400/[0.06]"
                : "";
        return (
          <div key={n}>
            <RemovedLines lines={removed.get(n)} />
            <button
              type="button"
              data-line={n}
              aria-pressed={flagged}
              disabled={solved || (blank && !flagged)}
              onClick={() => onToggle(key)}
              className={`group flex w-full text-left ${tone} ${solved || blank ? "cursor-default" : "hover:bg-violet-500/15"} focus-visible:outline focus-visible:outline-violet-400`}
            >
              {/* The accessible name is the visible text ("Line 12, <code>") plus the state, so voice
                  control users can say what they see (axe label-content-name-mismatch). */}
              <span aria-hidden className="w-8 shrink-0 text-center select-none">
                {revealed ? "✅" : falseAlarm ? "⚠️" : flagged ? "🚩" : blank || solved ? null : (
                  // A flag on every line says "these are tappable" before anyone hovers.
                  <span aria-hidden className="text-slate-500 group-hover:text-violet-300">⚑</span>
                )}
              </span>
              <span className="w-10 shrink-0 pr-2 text-right text-slate-300 select-none">
                <span className="sr-only">Line </span>
                {n}
                <span className="sr-only">: </span>
              </span>
              <span aria-hidden className={`w-4 shrink-0 select-none ${added.has(n) ? "text-emerald-400" : "text-transparent"}`}>+</span>
              <span className={`${WRAP} text-slate-200`}>{line}</span>
              <span className="sr-only">{`${flagged ? ", flagged" : ""}${falseAlarm ? ", false alarm" : ""}${revealed ? ", real problem" : ""}`}</span>
            </button>
            {falseAlarm && (
              <div className="ml-[5.5rem] mb-1 font-sans text-xs text-amber-300">
                False alarm: this line looks fine (−{FALSE_ALARM_COST} XP). Unflag it and keep looking.
              </div>
            )}
            {explainHere && (
              <div className="mr-4 mb-2 ml-[5.5rem] rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 font-sans text-sm whitespace-normal text-emerald-100">
                <Markdown text={review.issues[issue].explain} />
              </div>
            )}
          </div>
        );
      })}
      <RemovedLines lines={removed.get(lines.length + 1)} />
    </div>
  );
}

/** Lines the PR deleted: shown in red for context, but there's nothing to flag on them. */
function RemovedLines({ lines }: { lines: string[] | undefined }) {
  if (!lines?.length) return null;
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex bg-red-500/[0.08] text-red-300/80 select-none" title="Removed in this PR" data-testid="removed-line">
          <span className="w-8 shrink-0" />
          <span className="w-10 shrink-0" />
          <span className="w-4 shrink-0 text-red-400">−</span>
          <span className={`${WRAP} line-through decoration-red-400/40`}>{line}</span>
        </div>
      ))}
    </>
  );
}

function Verdict({ review, last, solved, onJump }: { review: Review; last: ReturnType<typeof checkReview> | null; solved: boolean; onJump: (path: string) => void }) {
  const total = review.issues.length;
  if (solved) {
    return (
      <div data-testid="review-verdict" className="mt-3 space-y-2">
        <p className="text-sm font-semibold text-emerald-300">
          ✅ Review complete: you caught {total === 1 ? "the problem" : `all ${total} problems`} in {review.author}&apos;s PR.
        </p>
        <ul className="space-y-1.5 text-sm">
          {review.issues.map((issue, i) => (
            <li key={i} className="rounded-lg bg-slate-950/60 p-2.5 text-slate-300">
              <button onClick={() => onJump(issue.file)} className="font-mono text-xs text-cyan-300 hover:underline">
                {issue.file}:{issue.line}
              </button>
              <Markdown text={issue.explain} className="mt-1" />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (!last) {
    return (
      <p className="mt-2 text-sm text-slate-300">
        There {total === 1 ? "is 1 real problem" : `are ${total} real problems`} in this PR. Flag the line where each one is, then submit.
      </p>
    );
  }
  const missing = total - last.found.length;
  return (
    <div data-testid="review-verdict" className="mt-3 space-y-1 text-sm">
      <p className={missing === 0 ? "font-semibold text-emerald-300" : "font-semibold text-amber-300"}>
        You found {last.found.length} of {total} problem{total === 1 ? "" : "s"}.
      </p>
      {last.falseAlarms.length > 0 && (
        <p className="text-amber-200">
          ⚠️ {last.falseAlarms.length} flagged line{last.falseAlarms.length === 1 ? " was a false alarm" : "s were false alarms"} (marked in the code).
        </p>
      )}
      {missing > 0 && (
        <p className="text-slate-400">
          {missing === 1 ? "One problem is" : `${missing} problems are`} still hiding. Compare each line with what the docstrings promise, then submit again.
        </p>
      )}
    </div>
  );
}
