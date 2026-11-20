"use client";
// Per-browser memory for the backup reminder: when the learner last backed up
// and when they last dismissed the reminder. A convenience only: if storage is
// blocked, the reminder just shows again.
import { parseBackupMeta, type BackupMeta } from "./backup";

export const BACKUP_META_KEY = "devjourney:backup:v1";

export function readBackupMeta(): BackupMeta {
  try {
    return parseBackupMeta(window.localStorage.getItem(BACKUP_META_KEY));
  } catch {
    return {};
  }
}

function write(patch: BackupMeta) {
  try {
    window.localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ ...readBackupMeta(), ...patch }));
  } catch {
    // ignore
  }
}

export function markBackedUp(now = new Date()) {
  write({ lastBackupAt: now.toISOString() });
}

export function dismissBackupReminder(now = new Date()) {
  write({ dismissedAt: now.toISOString() });
}

/** Save text as a file through a temporary <a download> link (no server involved). */
export function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
