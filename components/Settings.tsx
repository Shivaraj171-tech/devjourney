"use client";
// /settings/: back up, restore and reset progress, and make a class report code
// for a teacher. Everything happens in this browser: codes and files are
// encoded/decoded locally (lib/progress/backup.ts, lib/teacher/report.ts).
import Link from "next/link";
import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { hitlScore } from "@/lib/game/byte";
import { dayKey } from "@/lib/game/rules";
import {
  backupFileJson,
  backupFileName,
  backupSummary,
  encodeBackupCode,
  previewLine,
  readBackupText,
  savedAgoText,
  type ImportOk,
} from "@/lib/progress/backup";
import { downloadText, markBackedUp, readBackupMeta } from "@/lib/progress/backupMeta";
import { actions, totalXp, useProgress, type Progress } from "@/lib/progress/store";
import { buildReport, encodeReport, NAME_MAX } from "@/lib/teacher/report";
import { useIsClient } from "@/lib/useIsClient";
import { applyTheme, readTheme, type ThemeChoice } from "@/lib/theme";
import { copyText } from "./ShareButton";

export type ReportSeason = { id: string; ticketIds: string[] };

const CARD = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
const INPUT =
  "mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40";
const BTN_PRIMARY =
  "rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function Settings({ seasons }: { seasons: ReportSeason[] }) {
  const isClient = useIsClient();
  if (!isClient) return <div className="p-8 text-center text-slate-400">Opening settings…</div>;
  return <SettingsView seasons={seasons} />;
}

function SettingsView({ seasons }: { seasons: ReportSeason[] }) {
  const progress = useProgress();
  const summary = backupSummary(progress);
  const xp = totalXp(progress);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">⚙️ Settings &amp; backup</h1>
        <p className="mt-2 text-slate-300">
          Your progress is saved only in this browser, never on a server. Browsers can clear it (Safari does after 7 days without a
          visit), so keep a backup somewhere safe.
        </p>
        <p className="mt-3 inline-block rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200" data-testid="settings-summary">
          {summary.playerName === "You" ? "You" : summary.playerName} · {summary.ticketsMerged} ticket{summary.ticketsMerged === 1 ? "" : "s"} merged · {xp} XP
        </p>
      </header>
      <ThemeSection />
      <BackupSection progress={progress} />
      <RestoreSection current={`${summary.ticketsMerged} tickets merged, ${xp} XP`} />
      <ClassReportSection progress={progress} seasons={seasons} xp={xp} />
      <ResetSection />
    </div>
  );
}

/** Light or dark: follow the system (default), or pick one for this browser. */
function ThemeSection() {
  const [choice, setChoice] = useState<ThemeChoice>(() => readTheme());
  const options: { id: ThemeChoice; label: string }[] = [
    { id: "system", label: "Same as my device" },
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
  ];
  return (
    <Section id="theme-title" title="Theme" testId="theme-section">
      <div role="radiogroup" aria-labelledby="theme-title" className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={choice === o.id}
            data-testid={`theme-${o.id}`}
            onClick={() => {
              applyTheme(o.id);
              setChoice(o.id);
            }}
            className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-semibold ${
              choice === o.id ? "border-signal bg-signal/15 text-ink" : "border-slate-600 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function Section({ id, title, children, testId }: { id: string; title: string; children: ReactNode; testId?: string }) {
  return (
    <section aria-labelledby={id} className={CARD} data-testid={testId}>
      <h2 id={id} className="text-lg font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function CopyButton({ text, testId, onCopied }: { text: string; testId: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "manual">("idle");
  return (
    <>
      <button
        type="button"
        data-testid={testId}
        className={BTN_SECONDARY}
        onClick={async () => {
          const ok = await copyText(text);
          setCopied(ok ? "ok" : "manual");
          onCopied?.();
        }}
      >
        {copied === "ok" ? "✓ Copied" : "Copy"}
      </button>
      <span role="status" aria-live="polite" className="text-sm text-slate-300">
        {copied === "ok" ? "Copied to the clipboard." : copied === "manual" ? "Select the code above and copy it." : ""}
      </span>
    </>
  );
}

// ---------- back up ----------

function BackupSection({ progress }: { progress: Progress }) {
  const [code, setCode] = useState<string | null>(null);
  const [last, setLast] = useState(() => readBackupMeta().lastBackupAt ?? null);
  const codeId = useId();
  const area = useRef<HTMLTextAreaElement>(null);

  const backedUp = () => {
    markBackedUp();
    setLast(new Date().toISOString());
  };

  return (
    <Section id="backup-title" title="💾 Back up your progress" testId="backup-section">
      <p className="mt-1 text-sm text-slate-300">
        Download a file, or copy a backup code and keep it in your notes or email. Either one brings everything back on any browser.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="backup-download"
          className={BTN_PRIMARY}
          onClick={() => {
            const now = new Date();
            downloadText(backupFileName(now), backupFileJson(progress, now), "application/json");
            backedUp();
          }}
        >
          ⬇️ Download backup file
        </button>
        <button
          type="button"
          data-testid="backup-show-code"
          className={BTN_SECONDARY}
          onClick={async () => {
            setCode(await encodeBackupCode(progress, new Date()));
            requestAnimationFrame(() => area.current?.focus());
          }}
        >
          {code ? "↻ Refresh backup code" : "🔑 Show backup code"}
        </button>
      </div>
      {code && (
        <div className="mt-3">
          <label htmlFor={codeId} className="text-sm font-semibold text-slate-200">
            Your backup code <span className="font-normal text-slate-400">({code.length.toLocaleString()} characters, copy all of it)</span>
          </label>
          <textarea
            id={codeId}
            ref={area}
            readOnly
            data-testid="backup-code"
            value={code}
            rows={4}
            onFocus={(e) => e.currentTarget.select()}
            className={`${INPUT} font-mono text-xs break-all`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CopyButton text={code} testId="backup-copy" onCopied={backedUp} />
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400" data-testid="backup-last">
        {last ? `Last backup from this browser: ${savedAgoText(last, new Date()).replace("saved ", "")}.` : "No backup from this browser yet."}
      </p>
    </Section>
  );
}

// ---------- restore ----------

function RestoreSection({ current }: { current: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportOk | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const codeId = useId();
  const fileId = useId();
  const errorId = useId();

  async function check(source: string) {
    setDone(null);
    setPreview(null);
    const result = await readBackupText(source);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setPreview(result);
    requestAnimationFrame(() => previewRef.current?.focus());
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 20_000_000) {
      setError("That file is too big to be a DevJourney backup.");
      return;
    }
    await check(await file.text());
  }

  return (
    <Section id="restore-title" title="📥 Restore from a backup" testId="restore-section">
      <p className="mt-1 text-sm text-slate-300">You&apos;ll see what&apos;s in the backup before anything changes.</p>
      <div className="mt-3">
        <label htmlFor={fileId} className="text-sm font-semibold text-slate-200">Backup file (.json)</label>
        <input
          id={fileId}
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          data-testid="restore-file"
          onChange={(e) => onFile(e.currentTarget.files?.[0])}
          className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-600"
        />
      </div>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          check(text);
        }}
      >
        <label htmlFor={codeId} className="text-sm font-semibold text-slate-200">…or paste a backup code</label>
        <textarea
          id={codeId}
          data-testid="restore-code"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="DJB1.z.…"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${INPUT} font-mono text-xs break-all`}
        />
        <button type="submit" data-testid="restore-check" className={`${BTN_SECONDARY} mt-2`} disabled={!text.trim()}>
          Check backup code
        </button>
      </form>
      {error && (
        <p id={errorId} role="alert" data-testid="restore-error" className="mt-3 rounded-lg border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-100">
          ⚠️ {error}
        </p>
      )}
      {preview && (
        <RestorePreview
          preview={preview}
          current={current}
          focusRef={previewRef}
          onCancel={() => setPreview(null)}
          onConfirm={() => {
            actions.replaceAll(preview.progress);
            const who = preview.progress.playerName === "You" ? "" : `, ${preview.progress.playerName}`;
            setDone(`Progress restored. Welcome back${who}!`);
            setPreview(null);
            setText("");
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      )}
      {done && (
        <p role="status" data-testid="restore-done" className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-950/40 p-3 text-sm text-emerald-100">
          ✅ {done} <Link href="/" className="font-semibold text-emerald-200 underline">Back to the office</Link>
        </p>
      )}
    </Section>
  );
}

function RestorePreview({
  preview,
  current,
  focusRef,
  onCancel,
  onConfirm,
}: {
  preview: ImportOk;
  current: string;
  focusRef: RefObject<HTMLDivElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const s = backupSummary(preview.progress);
  const line = previewLine(s, totalXp(preview.progress), preview.exportedAt, new Date());
  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      role="group"
      aria-labelledby="restore-preview-title"
      data-testid="restore-preview"
      className="mt-3 rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-4 focus:outline-2 focus:outline-cyan-300"
    >
      <h3 id="restore-preview-title" className="font-bold text-white">
        Backup found{s.playerName !== "You" ? ` for ${s.playerName}` : ""}
      </h3>
      <p className="mt-1 font-mono text-cyan-100" data-testid="restore-preview-line">{line}</p>
      <p className="mt-2 text-sm text-slate-200">
        Restoring <b>replaces</b> the progress in this browser right now ({current}). This can&apos;t be undone, unless you back that up
        first.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" data-testid="restore-confirm" onClick={onConfirm} className={BTN_PRIMARY}>
          Replace my progress
        </button>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------- class report ----------

function ClassReportSection({ progress, seasons, xp }: { progress: Progress; seasons: ReportSeason[]; xp: number }) {
  const [name, setName] = useState(progress.playerName === "You" ? "" : progress.playerName);
  const [classCode, setClassCode] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const classId = useId();
  const codeId = useId();
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);

  return (
    <Section id="report-title" title="🎓 Class report for your teacher" testId="report-section">
      <p className="mt-1 text-sm text-slate-300">
        If your teacher gave you a class code, make a report code and send it to them. It contains only your name, the class code,
        tickets merged per floor, XP, your Byte (human-in-the-loop) stats, skills check scores and the day you last played. No code,
        no answers.
      </p>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const now = new Date();
          const result = buildReport({
            name,
            classCode,
            now,
            today: dayKey(now),
            activeDays: progress.activeDays,
            xp,
            seasons,
            solved: (id) => !!progress.tickets[id]?.solved,
            hitl: hitlScore(Object.values(progress.tickets)),
            skillsCheck: progress.skillsCheck,
          });
          if (!result.ok) {
            setError(result.error);
            setCode(null);
            return;
          }
          setError(null);
          setCode(encodeReport(result.report));
          requestAnimationFrame(() => area.current?.focus());
        }}
      >
        <div>
          <label htmlFor={nameId} className="text-sm font-semibold text-slate-200">Your name</label>
          <input id={nameId} data-testid="report-name" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} autoComplete="name" className={INPUT} placeholder="As your teacher knows you" />
        </div>
        <div>
          <label htmlFor={classId} className="text-sm font-semibold text-slate-200">Class code</label>
          <input
            id={classId}
            data-testid="report-class"
            value={classCode}
            maxLength={20}
            onChange={(e) => setClassCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`${INPUT} font-mono uppercase placeholder:normal-case`}
            placeholder="e.g. CS1-BLUE"
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" data-testid="report-generate" className={BTN_PRIMARY}>Create class report code</button>
        </div>
      </form>
      {error && (
        <p id={errorId} role="alert" data-testid="report-error" className="mt-3 rounded-lg border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-100">
          ⚠️ {error}
        </p>
      )}
      {code && (
        <div className="mt-3">
          <label htmlFor={codeId} className="text-sm font-semibold text-slate-200">Your class report code: send all of it to your teacher</label>
          <textarea id={codeId} ref={area} readOnly rows={3} value={code} data-testid="report-code" onFocus={(e) => e.currentTarget.select()} className={`${INPUT} font-mono text-xs break-all`} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CopyButton text={code} testId="report-copy" />
          </div>
        </div>
      )}
      <p className="mt-4 text-sm text-slate-300">
        Teacher? <Link href="/teacher" data-testid="teacher-link" className="font-semibold text-cyan-300 underline hover:text-cyan-200">Open the teacher view</Link> to read your class&apos;s codes.
      </p>
    </Section>
  );
}

// ---------- reset ----------

const RESET_WORD = "RESET";

function ResetSection() {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const inputId = useId();
  return (
    <Section id="reset-title" title="🗑️ Reset progress" testId="reset-section">
      <p className="mt-1 text-sm text-slate-300">
        Start over from day one in this browser. Everything (tickets, XP, streak, skills check) is deleted. Back up first if you might want it back.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed !== RESET_WORD) return;
          actions.resetAll();
          setTyped("");
          setDone(true);
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="text-sm font-semibold text-slate-200">
            Type <span className="font-mono text-rose-200">{RESET_WORD}</span> to confirm
          </label>
          <input
            id={inputId}
            data-testid="reset-input"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setDone(false);
            }}
            autoComplete="off"
            spellCheck={false}
            className={`${INPUT} font-mono`}
          />
        </div>
        <button
          type="submit"
          data-testid="reset-button"
          disabled={typed !== RESET_WORD}
          className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset everything
        </button>
      </form>
      <p role="status" className="mt-2 text-sm text-emerald-200" data-testid="reset-done">
        {done ? "Progress reset. Your first day starts again in the office." : ""}
      </p>
    </Section>
  );
}
