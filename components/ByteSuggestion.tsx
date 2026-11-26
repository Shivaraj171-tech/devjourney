"use client";
// "🤖 Byte has a suggestion": Byte (the office AI) proposes a change to the
// learner's code. Accept applies it, Reject leaves the code alone, "Edit it
// myself" applies it and leaves the fixing to the learner. Whether Byte was
// right is only revealed once the learner has decided (and, for Accept, run
// the tests), because checking is the whole point.
//
// "Decide before evidence" (byte.yaml `why`): the learner first picks a call
// (Accept / Reject / Edit) AND the reason from three options, then locks both
// in. Only then is Byte's code applied. XP needs the right call and the right reason.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ByteSuggestion as Suggestion, ByteWhy } from "@/lib/content/types";
import {
  applySuggestion,
  CATCH_XP,
  reasonOk,
  suggestionLine,
  suggestionOutcome,
  TRUST_XP,
  type ByteDecision,
  type SuggestionOutcome,
  type SuggestionRecord,
} from "@/lib/game/byte";
import { shuffledOrder } from "@/lib/game/shuffle";
import { byteActions, type TicketProgress } from "@/lib/progress/store";
import { InlineMarkdown } from "./Markdown";
import { onRadioGroupKeyDown, radioTabIndex } from "./radioGroup";

type Props = {
  ticketId: string;
  suggestion: Suggestion;
  tp: TicketProgress;
  /** The learner's current text of suggestion.file. */
  currentText: string;
  /** Season 1: Byte is still just the editor's autocomplete. */
  autocomplete: boolean;
  /** Called after Byte's code was written into the file (to show that file in the editor). */
  onApplied: (path: string) => void;
  /** ticket.yaml `tutorial: true`: a practice round (kinder verdict, left out of the score). */
  tutorial?: boolean;
};

export default function ByteSuggestionCard({ ticketId, suggestion, tp, currentText, autocomplete, onApplied, tutorial = false }: Props) {
  const record = tp.byteSuggestion;
  const outcome = record ? suggestionOutcome(record, tp) : null;
  const applied = applySuggestion(currentText, suggestion.find, suggestion.replace);
  const line = suggestionLine(currentText, suggestion.find);

  // When a test run reveals the verdict (pending -> judged), bring the card into view:
  // the learner is probably looking at the CI checks, not at the ticket.
  const cardRef = useRef<HTMLElement>(null);
  const lastOutcome = useRef(outcome);
  useEffect(() => {
    if (lastOutcome.current === "pending" && outcome !== "pending") {
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    lastOutcome.current = outcome;
  }, [outcome]);

  // "why" mode: the call and the reason are picked first, then locked in together.
  const why = suggestion.why;
  const [pendingDecision, setPendingDecision] = useState<ByteDecision | null>(null);
  const [pendingReason, setPendingReason] = useState<number | null>(null);

  function decide(decision: ByteDecision, reason?: number) {
    const whyRecord = why && reason !== undefined ? { reason, reasonCorrect: reason === why.answer } : undefined;
    if (decision === "reject" || applied === null) {
      byteActions.decide(ticketId, "reject", suggestion.correct, undefined, whyRecord, tutorial);
      return;
    }
    byteActions.decide(ticketId, decision, suggestion.correct, { path: suggestion.file, text: applied }, whyRecord, tutorial);
    onApplied(suggestion.file);
  }

  function choose(decision: ByteDecision) {
    if (why) setPendingDecision(decision);
    else decide(decision);
  }

  const pressed = (d: ByteDecision) => (why ? { "aria-pressed": pendingDecision === d } : {});
  const ring = (d: ByteDecision) => (why && pendingDecision === d ? " ring-2 ring-white/80 ring-offset-2 ring-offset-slate-900" : "");

  return (
    <section
      ref={cardRef}
      data-testid="byte-suggestion"
      data-outcome={outcome ?? "undecided"}
      aria-label="Byte's suggestion"
      tabIndex={-1}
      className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🤖</span>
        <div className="min-w-0">
          <div className="font-semibold text-white">
            {autocomplete ? "Byte's autocomplete has a suggestion" : "Byte has a suggestion"}
          </div>
          <div className="text-xs text-violet-200/80">
            for <code className="text-amber-200">{suggestion.file}</code>
            {line !== null && !record && <> · line {line}</>}
          </div>
        </div>
      </div>
      <p className="mt-2 text-violet-50">
        <span aria-hidden>“</span>
        <InlineCode text={suggestion.says} />
        <span aria-hidden>”</span>
      </p>

      <DiffPreview find={suggestion.find} replace={suggestion.replace} />

      {!record && !tp.solved && (
        <>
          {applied === null && (
            <p className="mt-2 text-xs text-amber-200" data-testid="byte-stale">
              Your code has changed since Byte looked at it, so its change no longer fits. You can still turn it down.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            {why
              ? "Make the call first. Then say why, and lock both in. Byte's code is only applied after that."
              : <>Read it like a reviewer: would it pass the &quot;Done when&quot; list? Byte sounds just as sure when it&apos;s wrong.</>}
          </p>
          {why && <div className="mt-2 text-xs font-semibold text-violet-100" id={`${ticketId}-byte-call`}>1. Your call</div>}
          <div className="mt-2 grid grid-cols-3 gap-2" role={why ? "group" : undefined} aria-labelledby={why ? `${ticketId}-byte-call` : undefined}>
            <button
              data-testid="byte-accept"
              onClick={() => choose("accept")}
              disabled={applied === null}
              {...pressed("accept")}
              className={`rounded-lg border border-emerald-400/60 px-2 py-2 font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-400${why && pendingDecision === "accept" ? " bg-emerald-500/20" : ""}${ring("accept")}`}
            >
              ✓ Accept
            </button>
            <button
              data-testid="byte-reject"
              onClick={() => choose("reject")}
              {...pressed("reject")}
              className={`rounded-lg border border-red-400/50 px-2 py-2 font-semibold text-red-200 hover:bg-red-500/10${why && pendingDecision === "reject" ? " bg-red-500/20" : ""}${ring("reject")}`}
            >
              ✕ Reject
            </button>
            <button
              data-testid="byte-edit"
              onClick={() => choose("edit")}
              disabled={applied === null}
              {...pressed("edit")}
              className={`rounded-lg border border-cyan-400/50 px-2 py-2 font-semibold text-cyan-100 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500${why && pendingDecision === "edit" ? " bg-cyan-500/20" : ""}${ring("edit")}`}
            >
              ✎ Edit it myself
            </button>
          </div>
          {/* The reason is asked once a call is picked, one question at a time (audit flaw 5). */}
          {why && pendingDecision !== null && (
            <WhyPicker
              why={why}
              seed={`${ticketId}:why`}
              picked={pendingReason}
              onPick={setPendingReason}
              ready={pendingDecision !== null && pendingReason !== null}
              onLock={() => pendingDecision && pendingReason !== null && decide(pendingDecision, pendingReason)}
            />
          )}
        </>
      )}

      {!record && tp.solved && (
        <Verdict tone="neutral" title="You solved this one without Byte.">
          Byte&apos;s suggestion was {suggestion.correct ? (suggestion.partial ? "right, but only part of the fix" : "right") : "wrong"}: <InlineCode text={suggestion.explain} />
        </Verdict>
      )}

      {record && outcome && (
        <OutcomeNote
          outcome={outcome}
          record={record}
          explain={suggestion.explain}
          file={suggestion.file}
          partial={suggestion.partial === true}
          practice={tutorial || record.tutorial === true}
        />
      )}
      {record && outcome && outcome !== "pending" && why && record.reason !== undefined && (
        <ReasonNote why={why} record={record} />
      )}
    </section>
  );
}

/** Step 2 of "decide before evidence": pick the reason, then lock in the call and the reason. */
function WhyPicker({
  why,
  seed,
  picked,
  onPick,
  ready,
  onLock,
}: {
  why: ByteWhy;
  seed: string;
  picked: number | null;
  onPick: (i: number) => void;
  ready: boolean;
  onLock: () => void;
}) {
  const order = shuffledOrder(why.choices.length, seed);
  return (
    <div className="mt-3" data-testid="byte-why">
      <div className="text-xs font-semibold text-violet-100" id={`${seed}-label`}>
        2. Why? Pick the reason that decides it
      </div>
      <div className="mt-1.5 space-y-1.5" role="radiogroup" aria-labelledby={`${seed}-label`} onKeyDown={onRadioGroupKeyDown}>
        {order.map((ci, i) => (
          <button
            key={ci}
            type="button"
            role="radio"
            aria-checked={picked === ci}
            tabIndex={radioTabIndex(i, picked === null ? null : order.indexOf(picked))}
            data-testid={`byte-why-${ci}`}
            onClick={() => onPick(ci)}
            className={`block w-full rounded-lg border px-2.5 py-2 text-left text-[13px] leading-snug transition ${
              picked === ci
                ? "border-violet-300 bg-violet-500/25 text-white"
                : "border-slate-700 text-slate-200 hover:border-violet-400/60 hover:bg-slate-800"
            }`}
          >
            <InlineCode text={why.choices[ci]} />
          </button>
        ))}
      </div>
      <button
        data-testid="byte-lock"
        onClick={onLock}
        disabled={!ready}
        className="mt-2 w-full rounded-lg bg-byte px-3 py-2 font-semibold text-page hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-300"
      >
        {ready ? "Lock in my call" : "Pick a reason to lock in your call"}
      </button>
    </div>
  );
}

/** After the verdict: was the learner's reason the real one? */
function ReasonNote({ why, record }: { why: ByteWhy; record: SuggestionRecord }) {
  const right = record.reasonCorrect === true;
  return (
    <div
      data-testid="byte-reason"
      data-reason={right ? "right" : "wrong"}
      className={`mt-2 rounded-lg border p-2.5 text-[13px] ${right ? "border-emerald-400/40 text-emerald-100" : "border-amber-400/50 text-amber-100"}`}
    >
      <div className="font-semibold">{right ? "✓ Your reason was the real one." : "✗ Your reason wasn't the one that decides it."}</div>
      {!right && (
        <div className="mt-1">
          The real reason: <InlineCode text={why.choices[why.answer]} />
        </div>
      )}
    </div>
  );
}

function OutcomeNote({
  outcome,
  record,
  explain,
  file,
  partial,
  practice,
}: {
  outcome: SuggestionOutcome;
  record: SuggestionRecord;
  explain: string;
  file: string;
  partial: boolean;
  /** A tutorial ticket: the first time this can happen, so teach, don't scold. */
  practice: boolean;
}) {
  const decision = record.decision;
  // "why" mode: a good outcome only pays out with the right reason too.
  if ((outcome === "caught" || outcome === "trusted") && !reasonOk(record)) {
    return (
      <Verdict tone="neutral" title={outcome === "caught" ? "Right call, shaky reason" : "Right to trust it, shaky reason"}>
        <InlineCode text={explain} /> The call was right, but the reason matters as much: next time, name what
        actually makes the code right or wrong. No XP this time, nothing lost.
      </Verdict>
    );
  }
  if (outcome === "pending") {
    return (
      <Verdict tone="neutral" title={decision === "edit" ? `Byte's code is in ${file}. Your turn.` : `Byte's code is in ${file}.`}>
        {decision === "edit"
          ? "Read it line by line, fix anything that's off, then run the tests. You own it now."
          : "Now run the tests: that's how you find out if Byte was right."}
      </Verdict>
    );
  }
  if (outcome === "waved-through" && practice) {
    return (
      <Verdict tone="bad" title="Byte slipped one past you. That's why we start here.">
        <p>Most new devs accept this one: it looks right, and Byte sounds sure. <InlineCode text={explain} /></p>
        <p className="mt-2 font-semibold text-amber-100">
          The habit to build: read the change, try one example in your head, and trust the tests, not the tone. Fix it now:
          the ticket still counts, and this practice round doesn&apos;t go on your human-in-the-loop score.
        </p>
      </Verdict>
    );
  }
  if (outcome === "waved-through") {
    return (
      <Verdict tone="bad" title="Byte's bug slipped through: you accepted it without checking">
        <p><InlineCode text={explain} /></p>
        <p className="mt-2 font-semibold text-amber-100">
          The lesson: Byte sounds sure either way. Before you accept, read the change, try one example in your head, and
          trust the tests, not the tone. Fix it now: the ticket still counts.
        </p>
      </Verdict>
    );
  }
  if (outcome === "caught") {
    return (
      <Verdict tone="good" title={`🕵️ Caught it! +${CATCH_XP} XP`}>
        {decision === "edit" ? "You took Byte's draft, found what was wrong and fixed it. " : "Byte was wrong, and you didn't let it in. "}
        <InlineCode text={explain} />
      </Verdict>
    );
  }
  if (outcome === "trusted") {
    return (
      <Verdict tone="good" title={`✅ Trusted correctly, +${TRUST_XP} XP`}>
        {partial
          ? "Byte's part is right, and you checked it before trusting it. It only does part of the job, so some checks still fail: the rest is yours. "
          : "Byte was right, and you checked it with the tests before trusting it. "}
        <InlineCode text={explain} />
      </Verdict>
    );
  }
  return (
    <Verdict tone="neutral" title="Byte was actually right this time">
      <InlineCode text={explain} /> No XP lost: being careful is never wrong. Write the fix yourself.
    </Verdict>
  );
}

function Verdict({ tone, title, children }: { tone: "good" | "bad" | "neutral"; title: string; children: ReactNode }) {
  const style =
    tone === "good"
      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-50"
      : tone === "bad"
        ? "border-amber-400/60 bg-amber-500/10 text-amber-50"
        : "border-slate-700 bg-slate-950/60 text-slate-200";
  return (
    <div data-testid="byte-outcome" role="status" className={`mt-3 rounded-lg border p-2.5 ${style}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

/** Byte's change as a tiny diff: removed lines in red, added lines in green. */
function DiffPreview({ find, replace }: { find: string; replace: string }) {
  const rows = [
    ...find.split("\n").map((text) => ({ sign: "-", text })),
    ...replace.split("\n").map((text) => ({ sign: "+", text })),
  ];
  return (
    <div className="mt-2 w-0 min-w-full rounded-lg border border-slate-800 bg-editor py-1 font-mono text-xs" data-testid="byte-diff">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex ${r.sign === "-" ? "bg-red-500/10 text-red-200" : "bg-emerald-500/10 text-emerald-200"}`}
        >
          <span className="w-5 shrink-0 text-center select-none" aria-label={r.sign === "-" ? "removed" : "added"}>
            {r.sign}
          </span>
          {/* Wrapped, never cut off: the detail that decides the call can be at the end of a line.
              Hanging indent: the wrapped part lines up under the code, not under its indentation. */}
          <span data-testid="byte-diff-line" className="flex min-w-0 flex-1 pr-3">
            <span className="shrink-0 whitespace-pre">{r.text.match(/^\s*/)?.[0]}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{r.text.trimStart()}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Before the learner's first test run: Byte's card stays folded to one line, so the
 * first decision of a ticket is made with evidence, not on Byte's tone.
 */
export function ByteTeaser({ autocomplete, onOpen }: { autocomplete: boolean; onOpen: () => void }) {
  return (
    <section
      data-testid="byte-teaser"
      aria-label="Byte's suggestion (folded)"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-violet-400/40 bg-violet-500/5 px-3 py-2 text-sm"
    >
      <span className="min-w-0 flex-1 text-violet-100">
        <span aria-hidden>🤖 </span>
        {autocomplete ? "Byte's autocomplete" : "Byte"} has a suggestion. <span className="text-slate-300">Run the checks first, then decide.</span>
      </span>
      <button
        type="button"
        data-testid="byte-teaser-open"
        onClick={onOpen}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-500/15 hover:text-white"
      >
        Peek now ▼
      </button>
    </section>
  );
}

/** Text with `backtick` (and **bold**) spans rendered like Markdown's inline text. */
export function InlineCode({ text }: { text: string }) {
  return <InlineMarkdown text={text} />;
}
