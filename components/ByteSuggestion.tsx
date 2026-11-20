"use client";
// "🤖 Byte has a suggestion": Byte (the office AI) proposes a change to the
// learner's code. Accept applies it, Reject leaves the code alone, "Edit it
// myself" applies it and leaves the fixing to the learner. Whether Byte was
// right is only revealed once the learner has decided (and, for Accept, run
// the tests), because checking is the whole point.
import { useEffect, useRef, type ReactNode } from "react";
import type { ByteSuggestion as Suggestion } from "@/lib/content/types";
import {
  applySuggestion,
  CATCH_XP,
  suggestionLine,
  suggestionOutcome,
  TRUST_XP,
  type ByteDecision,
  type SuggestionOutcome,
} from "@/lib/game/byte";
import { byteActions, type TicketProgress } from "@/lib/progress/store";

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
};

export default function ByteSuggestionCard({ ticketId, suggestion, tp, currentText, autocomplete, onApplied }: Props) {
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

  function decide(decision: ByteDecision) {
    if (decision === "reject" || applied === null) {
      byteActions.decide(ticketId, "reject", suggestion.correct);
      return;
    }
    byteActions.decide(ticketId, decision, suggestion.correct, { path: suggestion.file, text: applied });
    onApplied(suggestion.file);
  }

  return (
    <section
      ref={cardRef}
      data-testid="byte-suggestion"
      data-outcome={outcome ?? "undecided"}
      aria-label="Byte's suggestion"
      className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-3 text-sm"
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
            Read it like a reviewer: would it pass the &quot;Done when&quot; list? Byte sounds just as sure when it&apos;s wrong.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              data-testid="byte-accept"
              onClick={() => decide("accept")}
              disabled={applied === null}
              className="rounded-lg bg-emerald-600 px-2 py-2 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              ✓ Accept
            </button>
            <button
              data-testid="byte-reject"
              onClick={() => decide("reject")}
              className="rounded-lg border border-red-400/50 px-2 py-2 font-semibold text-red-200 hover:bg-red-500/10"
            >
              ✕ Reject
            </button>
            <button
              data-testid="byte-edit"
              onClick={() => decide("edit")}
              disabled={applied === null}
              className="rounded-lg border border-cyan-400/50 px-2 py-2 font-semibold text-cyan-100 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              ✎ Edit it myself
            </button>
          </div>
        </>
      )}

      {!record && tp.solved && (
        <Verdict tone="neutral" title="You solved this one without Byte.">
          Byte&apos;s suggestion was {suggestion.correct ? "right" : "wrong"}: <InlineCode text={suggestion.explain} />
        </Verdict>
      )}

      {record && outcome && <OutcomeNote outcome={outcome} decision={record.decision} explain={suggestion.explain} file={suggestion.file} />}
    </section>
  );
}

function OutcomeNote({ outcome, decision, explain, file }: { outcome: SuggestionOutcome; decision: ByteDecision; explain: string; file: string }) {
  if (outcome === "pending") {
    return (
      <Verdict tone="neutral" title={decision === "edit" ? `Byte's code is in ${file}. Your turn.` : `Byte's code is in ${file}.`}>
        {decision === "edit"
          ? "Read it line by line, fix anything that's off, then run the tests. You own it now."
          : "Now run the tests: that's how you find out if Byte was right."}
      </Verdict>
    );
  }
  if (outcome === "waved-through") {
    return (
      <Verdict tone="bad" title="You accepted Byte's code without checking">
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
        Byte was right, and you checked it with the tests before trusting it. <InlineCode text={explain} />
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
    <div className="mt-2 w-0 min-w-full overflow-x-auto rounded-lg border border-slate-800 bg-[#1e1e1e] py-1 font-mono text-xs" data-testid="byte-diff">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex whitespace-pre ${r.sign === "-" ? "bg-red-500/10 text-red-200" : "bg-emerald-500/10 text-emerald-200"}`}
        >
          <span className="w-5 shrink-0 text-center select-none" aria-label={r.sign === "-" ? "removed" : "added"}>
            {r.sign}
          </span>
          <span className="pr-3">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Text with `backtick` spans shown as code (content strings use Markdown-style backticks). */
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
          <code key={i} className="rounded bg-slate-950/70 px-1 font-mono text-[0.9em] text-amber-200">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
