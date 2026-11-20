// Teacher mode: turn pasted class report codes into a class overview.
// Parsing, merging, class averages, sorting and CSV export. Everything stays in
// the teacher's browser (localStorage, devjourney:teacher:v1).
// Pure functions only, so node can unit-test them.
import type { ClassReport } from "./report";
import { catchRate, decodeReport, normalizeClassCode, skillsGain, ticketsMerged } from "./report.ts";
import { isRecord } from "../progress/codec.ts";

export type Student = { code: string; report: ClassReport };
export type Problem = { line: number; message: string };

/**
 * Read pasted text or a file: one report code per line (anything around the code,
 * like "Ana: DJR1...", is ignored). Reports for another class are not added.
 */
export function parseReportCodes(text: string, classCode: string): { students: Student[]; problems: Problem[] } {
  const students: Student[] = [];
  const problems: Problem[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const token = /DJ[A-Z]\d*\.\S*/.exec(line)?.[0];
    if (!token) {
      problems.push({ line: i + 1, message: "No report code on this line (codes start with DJR1)." });
      return;
    }
    const decoded = decodeReport(token);
    if (!decoded.ok) {
      problems.push({ line: i + 1, message: decoded.error });
      return;
    }
    if (decoded.report.classCode !== classCode) {
      problems.push({ line: i + 1, message: `${decoded.report.name}'s report is for class ${decoded.report.classCode}, not ${classCode}. Not added.` });
      return;
    }
    students.push({ code: token, report: decoded.report });
  });
  return { students, problems };
}

const studentKey = (s: Student) => s.report.name.toLocaleLowerCase();

/**
 * Add new reports to a class. One row per student name (case-insensitive): a newer
 * report replaces an older one, an older one is ignored.
 */
export function mergeStudents(existing: Student[], incoming: Student[]): { students: Student[]; added: number; updated: number; skipped: number } {
  const byKey = new Map(existing.map((s) => [studentKey(s), s]));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const s of incoming) {
    const key = studentKey(s);
    const old = byKey.get(key);
    if (!old) {
      added++;
      byKey.set(key, s);
    } else if (old.code === s.code || s.report.generatedOn < old.report.generatedOn) {
      skipped++;
    } else {
      updated++;
      byKey.set(key, s);
    }
  }
  return { students: [...byKey.values()], added, updated, skipped };
}

// ---------- class averages ----------

export type FloorAverage = { id: string; avgMerged: number; total: number };

export type ClassSummary = {
  students: number;
  avgXp: number | null;
  avgTickets: number | null;
  floors: FloorAverage[];
  /** Mean of each student's catch rate (students who met a wrong suggestion). */
  catchRate: number | null;
  catchRateStudents: number;
  /** Mean skills-check gain (students with both baseline and final). */
  avgGain: number | null;
  gainStudents: number;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function classSummary(reports: ClassReport[]): ClassSummary {
  const floorIds: string[] = [];
  const totals = new Map<string, number>();
  for (const r of reports) {
    for (const s of r.seasons) {
      if (!totals.has(s.id)) floorIds.push(s.id);
      totals.set(s.id, Math.max(totals.get(s.id) ?? 0, s.total));
    }
  }
  const floors = floorIds.map((id) => ({
    id,
    total: totals.get(id) ?? 0,
    avgMerged: mean(reports.map((r) => r.seasons.find((s) => s.id === id)?.merged ?? 0)) ?? 0,
  }));
  const rates = reports.map(catchRate).filter((x): x is number => x !== null);
  const gains = reports.map(skillsGain).filter((x): x is number => x !== null);
  return {
    students: reports.length,
    avgXp: mean(reports.map((r) => r.xp)),
    avgTickets: mean(reports.map(ticketsMerged)),
    floors,
    catchRate: mean(rates),
    catchRateStudents: rates.length,
    avgGain: mean(gains),
    gainStudents: gains.length,
  };
}

// ---------- sorting ----------

export const SORT_KEYS = ["name", "tickets", "xp", "catch", "baseline", "final", "gain", "lastActive"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

function sortValue(r: ClassReport, key: SortKey): string | number | null {
  switch (key) {
    case "name": return r.name.toLocaleLowerCase();
    case "tickets": return ticketsMerged(r);
    case "xp": return r.xp;
    case "catch": return catchRate(r);
    case "baseline": return r.skills.baseline;
    case "final": return r.skills.final;
    case "gain": return skillsGain(r);
    case "lastActive": return r.lastActive;
  }
}

/** Sorted copy; students without a value (e.g. no skills check yet) always go last. */
export function sortStudents<T extends { report: ClassReport }>(rows: T[], key: SortKey, dir: "asc" | "desc"): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a.report, key);
    const vb = sortValue(b.report, key);
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign || a.report.name.localeCompare(b.report.name);
  });
}

// ---------- CSV ----------

/** One CSV cell: quoted when needed, and spreadsheet formulas neutralised. */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const pct = (x: number | null) => (x === null ? null : Math.round(x * 100));

/** The class as CSV (one row per student). `floorLabel` names a season id, e.g. "Floor 1". */
export function classCsv(reports: ClassReport[], floorLabel: (id: string) => string): string {
  const floorIds = classSummary(reports).floors.map((f) => f.id);
  const header = [
    "Name", "Class", "Last active", "Report date", "XP", "Tickets merged",
    ...floorIds.map((id) => `${floorLabel(id)} merged`),
    "Byte bugs caught", "Byte bugs waved through", "Catch rate %", "Good suggestions trusted", "Good suggestions doubted",
    "Best prompts", "Prompts tried", "Skills baseline", "Skills final", "Skills out of", "Skills gain",
  ];
  const rows = reports.map((r) => [
    r.name, r.classCode, r.lastActive, r.generatedOn, r.xp, ticketsMerged(r),
    ...floorIds.map((id) => r.seasons.find((s) => s.id === id)?.merged ?? 0),
    r.byte.caught, r.byte.wavedThrough, pct(catchRate(r)), r.byte.trusted, r.byte.doubted,
    r.byte.bestPrompts, r.byte.promptsTried, r.skills.baseline, r.skills.final, r.skills.total, skillsGain(r),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvFileName(classCode: string, today: string): string {
  return `devjourney-class-${classCode}-${today}.csv`;
}

// ---------- the teacher's saved classes (localStorage) ----------

export type TeacherStore = { lastClass?: string; classes: Record<string, string[]> };

export function parseTeacherStore(raw: string | null): TeacherStore {
  if (!raw) return { classes: {} };
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v) || !isRecord(v.classes)) return { classes: {} };
    const classes: Record<string, string[]> = {};
    for (const [code, list] of Object.entries(v.classes)) {
      if (normalizeClassCode(code) === code && Array.isArray(list)) classes[code] = list.filter((c): c is string => typeof c === "string");
    }
    const lastClass = typeof v.lastClass === "string" && normalizeClassCode(v.lastClass) === v.lastClass ? v.lastClass : undefined;
    return { lastClass, classes };
  } catch {
    return { classes: {} };
  }
}

/** A saved class's students (codes that no longer decode are dropped). */
export function studentsFromCodes(codes: string[], classCode: string): Student[] {
  return mergeStudents([], parseReportCodes(codes.join("\n"), classCode).students).students;
}
