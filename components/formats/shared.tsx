"use client";
// Small building blocks shared by the task-format cards (components/TaskFormats.tsx).
import type { ReactNode } from "react";
import type { FormatRequest } from "@/lib/game/formats";

/** Runs one task-format request in Python (Pyodide). { error } when Python couldn't answer. */
export type RunFormat = <T>(request: FormatRequest) => Promise<{ value: T } | { error: string }>;

export function FormatCard({
  testId,
  icon,
  title,
  subtitle,
  done,
  children,
}: {
  testId: string;
  /** No longer drawn: a practice card is named by its title. Kept so callers stay simple. */
  icon?: string;
  title: string;
  subtitle: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      data-done={done ? "true" : "false"}
      aria-label={title}
      className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white">
            {title}
            {done && <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-200">done</span>}
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

/** Read-only Python, scrollable sideways on its own so the page never scrolls sideways. */
export function CodeBlock({ code, label, testId }: { code: string; label?: string; testId?: string }) {
  return (
    <div className="min-w-0">
      {label && <div className="mb-1 text-xs font-semibold text-slate-300">{label}</div>}
      <pre
        data-testid={testId}
        tabIndex={0}
        aria-label={label ?? "Python code"}
        className="w-0 min-w-full overflow-x-auto rounded-lg border border-slate-800 bg-editor p-2.5 font-mono text-xs leading-relaxed text-slate-100"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Note({
  tone,
  title,
  children,
  testId,
}: {
  tone: "good" | "neutral" | "warn";
  title?: string;
  children?: ReactNode;
  testId?: string;
}) {
  const style =
    tone === "good"
      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-50"
      : tone === "warn"
        ? "border-amber-400/60 bg-amber-500/10 text-amber-50"
        : "border-slate-700 bg-slate-950/60 text-slate-200";
  return (
    <div data-testid={testId} role="status" className={`rounded-lg border p-2.5 text-[13px] leading-relaxed ${style}`}>
      {title && <div className="font-semibold">{title}</div>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export const primaryButton =
  "rounded-lg bg-cyan-600 px-3 py-2 font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400";
export const ghostButton =
  "rounded-lg border border-slate-600 px-2.5 py-1.5 text-slate-200 hover:border-cyan-400/60 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
