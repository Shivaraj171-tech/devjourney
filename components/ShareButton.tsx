"use client";
// "Share my score": copies a short text (with the site URL) to the clipboard.
// Falls back to a hidden-textarea copy, then to a selectable box the learner
// can copy by hand, so it never silently fails.
import { useRef, useState } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

type Props = {
  /** Built when clicked, so it can read the browser's URL. */
  getText: () => string;
  label?: string;
  testId?: string;
  className?: string;
};

export default function ShareButton({ getText, label = "📣 Share my score", testId = "share-score", className = "" }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [text, setText] = useState("");
  const fallback = useRef<HTMLTextAreaElement>(null);

  async function share() {
    const t = getText();
    setText(t);
    if (await copyText(t)) {
      setStatus("copied");
    } else {
      setStatus("manual");
      requestAnimationFrame(() => fallback.current?.select());
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={share}
        data-testid={testId}
        className={`rounded-xl border border-violet-400/50 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/25 ${className}`}
      >
        {status === "copied" ? "✓ Copied! Paste it anywhere" : label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? "Your score was copied to the clipboard." : status === "manual" ? "Copy the text below to share it." : ""}
      </span>
      {status === "manual" && (
        <label className="mt-2 block text-xs text-slate-300">
          Couldn&apos;t reach the clipboard. Copy this instead:
          <textarea
            ref={fallback}
            readOnly
            value={text}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100"
          />
        </label>
      )}
    </div>
  );
}
