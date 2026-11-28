"use client";
// "Ask Byte": pick the prompt you'd send Byte and see what it writes back.
// No real AI: every response is pre-written in the ticket's byte.yaml.
// Only the first pick counts (the best prompt first = a small XP bonus);
// afterwards every prompt can be tried to compare the answers.
import { useState } from "react";
import type { BytePrompt, BytePromptVerdict } from "@/lib/content/types";
import { BEST_PROMPT_XP, type PromptRecord } from "@/lib/game/byte";
import { InlineCode } from "./ByteSuggestion";
import Icon from "@/components/icons/Icon";

type Props = {
  card: BytePrompt;
  record?: PromptRecord;
  onPick: (index: number, best: boolean) => void;
};

const VERDICT: Record<BytePromptVerdict, { label: string; style: string }> = {
  good: { label: "Great prompt", style: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" },
  vague: { label: "Too vague", style: "border-amber-400/50 bg-amber-500/10 text-amber-100" },
  wrong: { label: "Misleading prompt", style: "border-red-400/50 bg-red-500/10 text-red-100" },
};

export default function AskByte({ card, record, onPick }: Props) {
  const [shown, setShown] = useState<number | null>(record?.firstPick ?? null);
  const option = shown !== null ? card.options[shown] : null;

  function pick(i: number) {
    setShown(i);
    if (!record) onPick(i, i === card.best);
  }

  return (
    <div className="space-y-4" data-testid="ask-byte">
      <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-3 text-sm">
        <div className="text-sm font-semibold text-violet-200">Your goal</div>
        <p className="mt-1 text-white"><InlineCode text={card.goal} /></p>
        <p className="mt-2 text-xs text-slate-400">
          Which prompt would you send Byte? Byte only knows what you tell it. Picking the best prompt first: +{BEST_PROMPT_XP} XP.
        </p>
      </div>

      <div className="space-y-2" role="group" aria-label="Prompts you could send Byte">
        {card.options.map((o, i) => {
          const active = shown === i;
          const first = record?.firstPick === i;
          return (
            <button
              key={i}
              data-testid={`prompt-option-${i}`}
              aria-pressed={active}
              onClick={() => pick(i)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                active ? "border-cyan-400/70 bg-cyan-500/10 text-white" : "border-slate-700 text-slate-200 hover:border-cyan-400/60 hover:bg-slate-800"
              }`}
            >
              <span className="italic">&ldquo;{o.prompt}&rdquo;</span>
              {first && <span className="ml-2 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[11px] whitespace-nowrap text-slate-300 not-italic">your first pick</span>}
            </button>
          );
        })}
      </div>

      {record && (
        <p data-testid="prompt-result" className={`text-sm ${record.best ? "text-emerald-300" : "text-slate-400"}`}>
          {record.best
            ? `Best prompt on the first try. +${BEST_PROMPT_XP} XP`
            : `The best prompt was #${card.best + 1}. No XP lost: compare the answers to see why.`}
        </p>
      )}

      {option && (
        <div data-testid="prompt-response" className="space-y-2">
          <div className="text-sm font-semibold text-byte">
            <Icon name="byte" className="mr-1.5" />
            Byte replies
          </div>
          <pre className="w-0 min-w-full overflow-x-auto rounded-lg border border-slate-800 bg-editor p-3 font-mono text-xs leading-relaxed text-slate-100">
            {option.responseCode}
          </pre>
          <div className={`rounded-lg border p-2.5 text-sm ${VERDICT[option.verdict].style}`}>
            <div className="font-semibold" data-testid="prompt-verdict">{VERDICT[option.verdict].label}</div>
            <p className="mt-1 text-[13px] leading-relaxed"><InlineCode text={option.feedback} /></p>
          </div>
        </div>
      )}
    </div>
  );
}
