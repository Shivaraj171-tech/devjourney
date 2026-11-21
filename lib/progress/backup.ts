// Progress backup: export the learner's progress as a JSON file or a copyable
// "backup code", and import it back (validated, previewed, then confirmed).
// Safari can clear localStorage after 7 days without a visit
// (docs/research/mobile-performance.md), so this is the learner's safety net.
//
// Backup code:  DJB1.<z|j>.<body>.<crc>
//   DJB1  format + version (a newer app bumps it to DJB2)
//   z     body is deflate-raw compressed JSON, base64url (CompressionStream)
//   j     body is plain JSON, base64url (browsers without CompressionStream)
//   crc   CRC-32 (8 hex digits) of "DJB1.<z|j>.<body>": catches cut-off or mistyped codes
// The JSON is the same envelope as the backup file: { app, kind, format, exportedAt, progress }.
//
// Pure functions only (type imports from the store), so node can unit-test them.
import type { Progress, TicketProgress } from "./store";
import { base64urlToBytes, base64urlToText, crc32, deflate, inflate, isRecord, textToBase64url, bytesToBase64url } from "./codec.ts";

export const BACKUP_FORMAT = 1;
export const BACKUP_PREFIX = `DJB${BACKUP_FORMAT}`;
const APP = "devjourney";
const KIND = "progress-backup";

export type BackupEnvelope = {
  app: typeof APP;
  kind: typeof KIND;
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  /** Backup files only: CRC-32 of JSON.stringify(progress). */
  checksum?: string;
  progress: Progress;
};

export type ImportOk = { ok: true; progress: Progress; exportedAt: string | null };
export type ImportResult = ImportOk | { ok: false; error: string };

const ERR = {
  empty: "Paste a backup code or choose a backup file first.",
  notOurs: "This doesn't look like a DevJourney backup. A backup code starts with DJB1, a backup file ends in .json.",
  report: "That's a class report code (for your teacher), not a progress backup.",
  newer: "This backup was made by a newer version of DevJourney. Reload the page to update, then try again.",
  damaged: "This code is damaged or incomplete (the checksum doesn't match). Copy the whole code again, with nothing missing.",
  unreadable: "This code couldn't be read: it looks cut off or changed. Copy the whole code again.",
  noInflate: "This browser can't unpack compressed codes. Use the backup file instead, or a newer browser.",
} as const;

// ---------- export ----------

export function makeEnvelope(progress: Progress, now: Date): BackupEnvelope {
  return { app: APP, kind: KIND, format: BACKUP_FORMAT, exportedAt: now.toISOString(), progress };
}

/** The downloadable backup file: readable JSON with a checksum of the progress. */
export function backupFileJson(progress: Progress, now: Date): string {
  const env: BackupEnvelope = { ...makeEnvelope(progress, now), checksum: crc32(JSON.stringify(progress)) };
  return JSON.stringify(env, null, 2);
}

export function backupFileName(now: Date): string {
  return `devjourney-progress-${now.toISOString().slice(0, 10)}.json`;
}

/** The copyable backup code (compressed when the browser can). */
export async function encodeBackupCode(progress: Progress, now: Date, opts: { compress?: boolean } = {}): Promise<string> {
  const json = JSON.stringify(makeEnvelope(progress, now));
  const packed = opts.compress === false ? null : await deflate(json);
  const head = `${BACKUP_PREFIX}.${packed ? "z" : "j"}`;
  const body = packed ? bytesToBase64url(packed) : textToBase64url(json);
  return `${head}.${body}.${crc32(`${head}.${body}`)}`;
}

// ---------- import ----------

/** Decode and validate a backup code (whitespace and line breaks are ignored). */
export async function decodeBackupCode(input: string): Promise<ImportResult> {
  const code = input.replace(/\s+/g, "");
  if (!code) return { ok: false, error: ERR.empty };
  if (/^DJR\d/.test(code)) return { ok: false, error: ERR.report };
  const version = /^DJB(\d+)\./.exec(code);
  if (!version) return { ok: false, error: ERR.notOurs };
  if (Number(version[1]) > BACKUP_FORMAT) return { ok: false, error: ERR.newer };
  const parts = code.split(".");
  if (parts.length !== 4 || (parts[1] !== "z" && parts[1] !== "j") || !/^[0-9a-f]{8}$/i.test(parts[3])) {
    return { ok: false, error: ERR.unreadable };
  }
  const [prefix, mode, body, sum] = parts;
  if (crc32(`${prefix}.${mode}.${body}`) !== sum.toLowerCase()) return { ok: false, error: ERR.damaged };
  let json: string | null;
  if (mode === "z") {
    const bytes = base64urlToBytes(body);
    if (!bytes) return { ok: false, error: ERR.unreadable };
    if (typeof DecompressionStream === "undefined") return { ok: false, error: ERR.noInflate };
    json = await inflate(bytes);
  } else {
    json = base64urlToText(body);
  }
  if (json === null) return { ok: false, error: ERR.unreadable };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: ERR.unreadable };
  }
  return readEnvelope(parsed);
}

/**
 * Read a chosen file or pasted text: a backup file (JSON envelope), a raw
 * progress object (e.g. copied out of localStorage), or a backup code.
 */
export async function readBackupText(text: string): Promise<ImportResult> {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) return { ok: false, error: ERR.empty };
  if (!trimmed.startsWith("{")) return decodeBackupCode(trimmed);
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "This file isn't valid JSON, so it can't be a DevJourney backup. Was it edited?" };
  }
  if (isRecord(parsed) && parsed.kind === undefined && "tickets" in parsed) {
    const v = validateProgress(parsed);
    return v.ok ? { ok: true, progress: v.progress, exportedAt: null } : v;
  }
  return readEnvelope(parsed);
}

function readEnvelope(parsed: unknown): ImportResult {
  if (!isRecord(parsed) || parsed.app !== APP || parsed.kind !== KIND) return { ok: false, error: ERR.notOurs };
  if (typeof parsed.format !== "number" || parsed.format > BACKUP_FORMAT) return { ok: false, error: ERR.newer };
  if (parsed.format !== BACKUP_FORMAT) return { ok: false, error: ERR.notOurs };
  if (parsed.checksum !== undefined && parsed.checksum !== crc32(JSON.stringify(parsed.progress))) {
    return { ok: false, error: "This backup file was changed after it was saved (the checksum doesn't match), so it isn't safe to load." };
  }
  const v = validateProgress(parsed.progress);
  if (!v.ok) return v;
  const exportedAt = typeof parsed.exportedAt === "string" && !Number.isNaN(Date.parse(parsed.exportedAt)) ? parsed.exportedAt : null;
  return { ok: true, progress: v.progress, exportedAt };
}

// ---------- validation ----------

type Check = (v: unknown) => boolean;
const isNum: Check = (v) => typeof v === "number" && Number.isFinite(v);
const isBool: Check = (v) => typeof v === "boolean";
const isStr: Check = (v) => typeof v === "string";
const isStrArray: Check = (v) => Array.isArray(v) && v.every(isStr);
const isStrMap: Check = (v) => isRecord(v) && Object.values(v).every(isStr);

const TICKET_FIELDS: Record<string, Check> = {
  code: isStrMap,
  runs: isNum,
  hintsUsed: isNum,
  solved: isBool,
  solvedAt: isStr,
  solveXp: isNum,
  quizFirstPick: (v) => Array.isArray(v) && v.every((x) => x === null || isNum(x)),
  quizDone: isBool,
  quizFirstTryCorrect: isNum,
  quizXp: isNum,
  reviewFlags: isStrArray,
  reviewSubmitted: isStrArray,
  reviewFalseAlarms: isStrArray,
  incidentStartedAt: isStr,
  byteSuggestion: isRecord,
  bytePrompt: isRecord,
  formats: isRecord,
};

const TICKET_DEFAULTS: TicketProgress = {
  code: {}, runs: 0, hintsUsed: 0, solved: false, solveXp: 0, quizFirstPick: [], quizDone: false, quizFirstTryCorrect: 0, quizXp: 0,
};

const PROGRESS_FIELDS: Record<string, Check> = {
  playerName: isStr,
  startedAt: (v) => isStr(v) && !Number.isNaN(Date.parse(v as string)),
  activeDays: (v) => Array.isArray(v) && v.every((d) => isStr(d) && /^\d{4}-\d{2}-\d{2}$/.test(d as string)),
  warmups: isRecord,
  warmupLog: (v) => Array.isArray(v) && v.every((a) => isRecord(a) && isStr(a.id) && isStr(a.day) && isBool(a.correct)),
  onboarded: isBool,
  skillsCheck: isRecord,
  openedTickets: isStrArray,
  tickets: isRecord,
};

export type Validation = { ok: true; progress: Progress } | { ok: false; error: string };

/**
 * Check a progress object's shape and fill in what older saves don't have.
 * Unknown fields are kept as they are (newer optional data survives a round trip).
 */
export function validateProgress(raw: unknown): Validation {
  const bad = (detail: string): Validation => ({ ok: false, error: `This backup doesn't contain valid DevJourney progress (${detail}).` });
  if (!isRecord(raw)) return bad("no progress found");
  if (raw.version !== undefined && raw.version !== 1) {
    return typeof raw.version === "number" && raw.version > 1 ? { ok: false, error: ERR.newer } : bad("unknown version");
  }
  if (!isRecord(raw.tickets)) return bad("no tickets");
  for (const [field, check] of Object.entries(PROGRESS_FIELDS)) {
    if (raw[field] !== undefined && !check(raw[field])) return bad(`"${field}" has the wrong type`);
  }
  const tickets: Record<string, TicketProgress> = {};
  for (const [id, t] of Object.entries(raw.tickets)) {
    if (!isRecord(t)) return bad(`ticket ${id} is not an object`);
    for (const [field, check] of Object.entries(TICKET_FIELDS)) {
      if (t[field] !== undefined && !check(t[field])) return bad(`ticket ${id}: "${field}" has the wrong type`);
    }
    tickets[id] = { ...TICKET_DEFAULTS, ...(t as Partial<TicketProgress>) };
  }
  const name = typeof raw.playerName === "string" ? raw.playerName.trim().slice(0, 24) : "";
  const progress = {
    ...raw,
    version: 1,
    playerName: name || "You",
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : firstDay(raw.activeDays as string[] | undefined),
    activeDays: (raw.activeDays as string[] | undefined) ?? [],
    tickets,
  } as Progress;
  return { ok: true, progress };
}

function firstDay(days: string[] | undefined): string {
  const first = [...(days ?? [])].sort()[0];
  return first ? new Date(`${first}T12:00:00`).toISOString() : new Date().toISOString();
}

// ---------- preview ----------

export type BackupSummary = { playerName: string; ticketsMerged: number; ticketsStarted: number; activeDays: number; lastActive: string | null };

export function backupSummary(p: Progress): BackupSummary {
  const tickets = Object.values(p.tickets);
  const days = [...p.activeDays].sort();
  return {
    playerName: p.playerName,
    ticketsMerged: tickets.filter((t) => t.solved).length,
    ticketsStarted: tickets.length,
    activeDays: days.length,
    lastActive: days.at(-1) ?? null,
  };
}

/** "saved today", "saved yesterday", "saved 3 days ago" (or "" when unknown). */
export function savedAgoText(iso: string | null, now: Date): string {
  if (!iso) return "";
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  if (Number.isNaN(days)) return "";
  if (days <= 0) return "saved today";
  if (days === 1) return "saved yesterday";
  return `saved ${days} days ago`;
}

/** "26 tickets merged, 1840 XP, saved 3 days ago" */
export function previewLine(s: BackupSummary, xp: number, exportedAt: string | null, now: Date): string {
  const tickets = `${s.ticketsMerged} ticket${s.ticketsMerged === 1 ? "" : "s"} merged`;
  return [tickets, `${xp} XP`, savedAgoText(exportedAt, now)].filter(Boolean).join(", ");
}

// ---------- the "back up your progress" reminder ----------

export const REMINDER_DAYS = 7;

/** Per-browser memory of backups and dismissals (localStorage, devjourney:backup:v1). */
export type BackupMeta = { lastBackupAt?: string; dismissedAt?: string };

export function parseBackupMeta(raw: string | null): BackupMeta {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return {};
    const out: BackupMeta = {};
    if (typeof v.lastBackupAt === "string") out.lastBackupAt = v.lastBackupAt;
    if (typeof v.dismissedAt === "string") out.dismissedAt = v.dismissedAt;
    return out;
  } catch {
    return {};
  }
}

/**
 * Show the HQ reminder when the learner has merged something and hasn't backed up
 * for REMINDER_DAYS (counting from when they started, if they never have).
 * "Not now" hides it for another REMINDER_DAYS.
 */
export function backupReminderDue(args: { ticketsMerged: number; startedAt: string; meta: BackupMeta; now: Date }): boolean {
  const { ticketsMerged, startedAt, meta, now } = args;
  if (ticketsMerged === 0) return false;
  const since = (iso: string | undefined) => (iso ? (now.getTime() - Date.parse(iso)) / 86_400_000 : Infinity);
  const sinceBackup = Math.min(since(meta.lastBackupAt), since(startedAt));
  if (!(sinceBackup >= REMINDER_DAYS)) return false;
  return !(since(meta.dismissedAt) < REMINDER_DAYS);
}
