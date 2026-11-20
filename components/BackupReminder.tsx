"use client";
// HQ: a gentle "back up your progress" card. Shown when the learner has merged
// tickets and hasn't backed up in 7+ days (lib/progress/backup.ts); "Not now"
// hides it for another week in this browser.
import Link from "next/link";
import { useState } from "react";
import { backupReminderDue } from "@/lib/progress/backup";
import { dismissBackupReminder, readBackupMeta } from "@/lib/progress/backupMeta";

type Props = { ticketsMerged: number; startedAt: string; now: Date };

export default function BackupReminder({ ticketsMerged, startedAt, now }: Props) {
  // Rendered only in the browser (the HQ waits for the client), so storage is readable here.
  const [meta] = useState(readBackupMeta);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !backupReminderDue({ ticketsMerged, startedAt, meta, now })) return null;

  return (
    <section
      data-testid="backup-reminder"
      aria-labelledby="backup-reminder-title"
      className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <h2 id="backup-reminder-title" className="font-bold text-white">💾 Keep your progress safe</h2>
        <p className="mt-0.5 text-sm text-slate-300">
          Your {ticketsMerged} merged ticket{ticketsMerged === 1 ? " lives" : "s live"} only in this browser, and some browsers clear sites
          you haven&apos;t visited for a week. A backup takes 10 seconds.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link href="/settings" data-testid="backup-reminder-go" className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
          Back up now →
        </Link>
        <button
          type="button"
          data-testid="backup-reminder-dismiss"
          onClick={() => {
            dismissBackupReminder();
            setDismissed(true);
          }}
          className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
