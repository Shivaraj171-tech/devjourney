// Class report codes: what a student hands their teacher (no accounts, no server).
//
// Code:  DJR1.<body>.<crc>
//   DJR1  format + version
//   body  base64url of a compact JSON object (exact keys, nothing else allowed):
//         v  1
//         n  name (max 24 chars, the only free text)
//         c  class code the student typed (A-Z, 0-9, "-", 2-16 chars)
//         g  report date (YYYY-MM-DD)
//         a  last active day (YYYY-MM-DD) or null
//         x  total XP
//         s  [[seasonId, merged, total], ...] tickets merged per season (floor)
//         h  [caught, wavedThrough, trusted, doubted, bestPrompts, promptsTried] (Byte, human in the loop)
//         k  [baseline, final, total] skills check scores (null = not taken)
//   crc   CRC-32 (8 hex digits) of "DJR1.<body>"
// No code, answers or other free text ever goes in a report.
//
// Pure functions only, so node can unit-test them.
import type { HitlScore } from "../game/byte";
import { base64urlToText, crc32, isRecord, textToBase64url } from "../progress/codec.ts";

export const REPORT_FORMAT = 1;
export const REPORT_PREFIX = `DJR${REPORT_FORMAT}`;
export const NAME_MAX = 24;

export type ByteStats = Pick<HitlScore, "caught" | "wavedThrough" | "trusted" | "doubted" | "bestPrompts" | "promptsTried">;

export type ClassReport = {
  name: string;
  classCode: string;
  /** YYYY-MM-DD */
  generatedOn: string;
  /** YYYY-MM-DD, or null if the student never played. */
  lastActive: string | null;
  xp: number;
  seasons: { id: string; merged: number; total: number }[];
  byte: ByteStats;
  skills: { baseline: number | null; final: number | null; total: number | null };
};

/** Upper-case, spaces removed; null if it isn't 2-16 of A-Z, 0-9 and "-". */
export function normalizeClassCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{2,16}$/.test(code) ? code : null;
}

/** Control characters removed, spaces collapsed, at most NAME_MAX characters. */
export function cleanName(input: string): string {
  return [...input.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim()].slice(0, NAME_MAX).join("").trim();
}

const BYTE_KEYS = ["caught", "wavedThrough", "trusted", "doubted", "bestPrompts", "promptsTried"] as const;

export type ReportInput = {
  name: string;
  classCode: string;
  now: Date;
  /** Local YYYY-MM-DD of `now` (dayKey). */
  today: string;
  activeDays: string[];
  xp: number;
  /** Seasons in floor order, with their ticket ids. */
  seasons: { id: string; ticketIds: string[] }[];
  solved: (ticketId: string) => boolean;
  hitl: HitlScore;
  skillsCheck?: { baseline?: { score: number; total: number }; final?: { score: number; total: number } };
};

export type BuildResult = { ok: true; report: ClassReport } | { ok: false; error: string };

export function buildReport(input: ReportInput): BuildResult {
  const name = cleanName(input.name);
  if (!name || name === "You") return { ok: false, error: "Type your name as your teacher knows you." };
  const classCode = normalizeClassCode(input.classCode);
  if (!classCode) return { ok: false, error: "Type the class code your teacher gave you (2-16 letters, numbers or dashes)." };
  const sc = input.skillsCheck;
  const days = [...input.activeDays].sort();
  return {
    ok: true,
    report: {
      name,
      classCode,
      generatedOn: input.today,
      lastActive: days.at(-1) ?? null,
      xp: Math.max(0, Math.round(input.xp)),
      seasons: input.seasons.map((s) => ({ id: s.id, merged: s.ticketIds.filter(input.solved).length, total: s.ticketIds.length })),
      byte: Object.fromEntries(BYTE_KEYS.map((k) => [k, input.hitl[k]])) as ByteStats,
      skills: { baseline: sc?.baseline?.score ?? null, final: sc?.final?.score ?? null, total: sc?.final?.total ?? sc?.baseline?.total ?? null },
    },
  };
}

export function encodeReport(r: ClassReport): string {
  const wire = {
    v: REPORT_FORMAT,
    n: r.name,
    c: r.classCode,
    g: r.generatedOn,
    a: r.lastActive,
    x: r.xp,
    s: r.seasons.map((s) => [s.id, s.merged, s.total]),
    h: BYTE_KEYS.map((k) => r.byte[k]),
    k: [r.skills.baseline, r.skills.final, r.skills.total],
  };
  const body = textToBase64url(JSON.stringify(wire));
  return `${REPORT_PREFIX}.${body}.${crc32(`${REPORT_PREFIX}.${body}`)}`;
}

export type DecodeResult = { ok: true; report: ClassReport } | { ok: false; error: string };

const WIRE_KEYS = ["a", "c", "g", "h", "k", "n", "s", "v", "x"];
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1_000_000;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isScore = (v: unknown): v is number | null => v === null || (isCount(v) && v <= 1000);

export function decodeReport(input: string): DecodeResult {
  const code = input.replace(/\s+/g, "");
  const fail = (error: string): DecodeResult => ({ ok: false, error });
  if (!code) return fail("Empty line.");
  if (/^DJB\d/.test(code)) return fail("That's a progress backup code, not a class report code.");
  const version = /^DJR(\d+)\./.exec(code);
  if (!version) return fail("Not a class report code (they start with DJR1).");
  if (Number(version[1]) > REPORT_FORMAT) return fail("Made by a newer version of DevJourney: reload this page and try again.");
  const parts = code.split(".");
  if (parts.length !== 3 || !/^[0-9a-f]{8}$/i.test(parts[2])) return fail("The code looks cut off. Ask the student to copy the whole code.");
  if (crc32(`${parts[0]}.${parts[1]}`) !== parts[2].toLowerCase()) {
    return fail("The code is damaged (checksum mismatch). Ask the student to copy it again.");
  }
  const json = base64urlToText(parts[1]);
  let w: unknown;
  try {
    w = json === null ? null : JSON.parse(json);
  } catch {
    w = null;
  }
  const invalid = fail("The code's contents aren't a valid class report.");
  if (!isRecord(w) || Object.keys(w).sort().join() !== WIRE_KEYS.join() || w.v !== REPORT_FORMAT) return invalid;
  if (typeof w.n !== "string" || cleanName(w.n) !== w.n || !w.n) return invalid;
  if (typeof w.c !== "string" || normalizeClassCode(w.c) !== w.c) return invalid;
  if (!isDay(w.g) || !(w.a === null || isDay(w.a)) || !isCount(w.x)) return invalid;
  if (!Array.isArray(w.s) || w.s.length > 50) return invalid;
  const seasons: ClassReport["seasons"] = [];
  for (const s of w.s) {
    if (!Array.isArray(s) || s.length !== 3 || typeof s[0] !== "string" || !/^[a-z0-9-]{1,16}$/.test(s[0])) return invalid;
    if (!isCount(s[1]) || !isCount(s[2]) || s[1] > s[2]) return invalid;
    seasons.push({ id: s[0], merged: s[1], total: s[2] });
  }
  if (!Array.isArray(w.h) || w.h.length !== BYTE_KEYS.length || !w.h.every(isCount)) return invalid;
  if (!Array.isArray(w.k) || w.k.length !== 3 || !w.k.every(isScore)) return invalid;
  const [baseline, final, total] = w.k as (number | null)[];
  return {
    ok: true,
    report: {
      name: w.n,
      classCode: w.c,
      generatedOn: w.g,
      lastActive: w.a as string | null,
      xp: w.x,
      seasons,
      byte: Object.fromEntries(BYTE_KEYS.map((k, i) => [k, (w.h as number[])[i]])) as ByteStats,
      skills: { baseline, final, total },
    },
  };
}

// ---------- numbers a teacher looks at ----------

export function ticketsMerged(r: ClassReport): number {
  return r.seasons.reduce((n, s) => n + s.merged, 0);
}

/** Share of Byte's wrong suggestions the student caught (0-1), or null with none seen yet. */
export function catchRate(r: ClassReport): number | null {
  const seen = r.byte.caught + r.byte.wavedThrough;
  return seen === 0 ? null : r.byte.caught / seen;
}

/** Skills check points gained from baseline to final, or null unless both were taken. */
export function skillsGain(r: ClassReport): number | null {
  return r.skills.baseline !== null && r.skills.final !== null ? r.skills.final - r.skills.baseline : null;
}
