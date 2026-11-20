import assert from "node:assert/strict";
import { test } from "node:test";
import { base64urlToText, crc32, textToBase64url } from "../progress/codec.ts";
import {
  buildReport,
  catchRate,
  cleanName,
  decodeReport,
  encodeReport,
  normalizeClassCode,
  skillsGain,
  ticketsMerged,
  type ClassReport,
  type ReportInput,
} from "../teacher/report.ts";
import {
  classCsv,
  classSummary,
  csvCell,
  mergeStudents,
  parseReportCodes,
  parseTeacherStore,
  sortStudents,
  studentsFromCodes,
} from "../teacher/classroom.ts";

const HITL = { caught: 3, wavedThrough: 1, trusted: 2, doubted: 0, pending: 1, bestPrompts: 2, promptsTried: 3 };

function input(over: Partial<ReportInput> = {}): ReportInput {
  const solved = new Set(["a1", "a2", "b1"]);
  return {
    name: "Ana",
    classCode: "cs1-blue",
    now: new Date("2026-11-20T12:00:00Z"),
    today: "2026-11-20",
    activeDays: ["2026-11-18", "2026-11-02"],
    xp: 1840,
    seasons: [{ id: "s01", ticketIds: ["a1", "a2", "a3"] }, { id: "s02", ticketIds: ["b1", "b2"] }],
    solved: (id) => solved.has(id),
    hitl: HITL,
    skillsCheck: { baseline: { score: 5, total: 12 }, final: { score: 11, total: 12 } },
    ...over,
  };
}

function report(over: Partial<ReportInput> = {}): ClassReport {
  const r = buildReport(input(over));
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.report;
}

test("report is built from progress numbers only", () => {
  const r = report();
  assert.deepEqual(r, {
    name: "Ana",
    classCode: "CS1-BLUE",
    generatedOn: "2026-11-20",
    lastActive: "2026-11-18",
    xp: 1840,
    seasons: [{ id: "s01", merged: 2, total: 3 }, { id: "s02", merged: 1, total: 2 }],
    byte: { caught: 3, wavedThrough: 1, trusted: 2, doubted: 0, bestPrompts: 2, promptsTried: 3 },
    skills: { baseline: 5, final: 11, total: 12 },
  });
  assert.equal(ticketsMerged(r), 3);
  assert.equal(catchRate(r), 0.75);
  assert.equal(skillsGain(r), 6);
});

test("name and class code are required and cleaned", () => {
  assert.equal(buildReport(input({ name: "  " })).ok, false);
  assert.equal(buildReport(input({ name: "You" })).ok, false);
  assert.equal(buildReport(input({ classCode: "x" })).ok, false);
  assert.equal(buildReport(input({ classCode: "no/slash" })).ok, false);
  assert.equal(normalizeClassCode(" cs 1 "), "CS1");
  assert.equal(cleanName("Ana\n\tMaria   Lopez-Garcia-Something-Long"), "Ana Maria Lopez-Garcia-S");
});

test("report code round trips and is compact", () => {
  const r = report();
  const code = encodeReport(r);
  assert.match(code, /^DJR1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
  assert.ok(code.length < 300, `length ${code.length}`);
  const back = decodeReport(code);
  assert.ok(back.ok);
  assert.deepEqual(back.report, r);

  const noSkills = report({ skillsCheck: undefined, activeDays: [] });
  const back2 = decodeReport(encodeReport(noSkills));
  assert.ok(back2.ok);
  assert.deepEqual(back2.report.skills, { baseline: null, final: null, total: null });
  assert.equal(back2.report.lastActive, null);
});

test("damaged, foreign or padded report codes are rejected", () => {
  const code = encodeReport(report());
  const err = (c: string) => {
    const r = decodeReport(c);
    assert.equal(r.ok, false);
    return r.ok ? "" : r.error;
  };
  assert.match(err("DJB1.z.abc.12345678"), /progress backup code/);
  assert.match(err("hello"), /Not a class report code/);
  assert.match(err("DJR9.abc.12345678"), /newer version/);
  assert.match(err(code.slice(0, -1)), /cut off/);
  const mid = 10;
  assert.match(err(code.slice(0, mid) + (code[mid] === "A" ? "B" : "A") + code.slice(mid + 1)), /checksum/);

  // A correctly checksummed code carrying extra free text is still refused.
  const wire = JSON.parse(base64urlToText(code.split(".")[1])!);
  const forged = (w: unknown) => {
    const body = textToBase64url(JSON.stringify(w));
    return `DJR1.${body}.${crc32(`DJR1.${body}`)}`;
  };
  assert.match(err(forged({ ...wire, note: "hi" })), /valid class report/);
  assert.match(err(forged({ ...wire, n: "a\nb" })), /valid class report/);
  assert.match(err(forged({ ...wire, s: [["s01", 5, 3]] })), /valid class report/);
  assert.ok(decodeReport(forged(wire)).ok);
});

test("parsing pasted codes: per line, other classes and junk reported", () => {
  const ana = encodeReport(report());
  const ben = encodeReport(report({ name: "Ben", xp: 300, skillsCheck: undefined }));
  const other = encodeReport(report({ name: "Cy", classCode: "OTHER" }));
  const text = `Ana: ${ana}\r\n\n${ben}\n${other}\nhello\n${ana.slice(0, 30)}`;
  const { students, problems } = parseReportCodes(text, "CS1-BLUE");
  assert.deepEqual(students.map((s) => s.report.name), ["Ana", "Ben"]);
  assert.equal(problems.length, 3);
  assert.deepEqual(problems.map((p) => p.line), [4, 5, 6]);
  assert.match(problems[0].message, /for class OTHER, not CS1-BLUE/);
});

test("merging keeps one row per student, newest report wins", () => {
  const old = { code: "a", report: report({ today: "2026-11-01", xp: 100 }) };
  const newer = { code: "b", report: report({ name: "ana", today: "2026-11-20", xp: 900 }) };
  const ben = { code: "c", report: report({ name: "Ben" }) };
  const m1 = mergeStudents([old], [newer, ben]);
  assert.deepEqual([m1.added, m1.updated, m1.skipped], [1, 1, 0]);
  assert.equal(m1.students.find((s) => s.report.name === "ana")?.report.xp, 900);
  const m2 = mergeStudents(m1.students, [old]);
  assert.deepEqual([m2.added, m2.updated, m2.skipped], [0, 0, 1]);
});

test("class averages: tickets per floor, catch rate, skills gain", () => {
  const a = report();
  const b = report({ name: "Ben", xp: 160, solved: (id) => id === "a1", hitl: { ...HITL, caught: 1, wavedThrough: 1 }, skillsCheck: { baseline: { score: 4, total: 12 }, final: { score: 6, total: 12 } } });
  const c = report({ name: "Cy", xp: 0, solved: () => false, hitl: { ...HITL, caught: 0, wavedThrough: 0 }, skillsCheck: undefined });
  const s = classSummary([a, b, c]);
  assert.equal(s.students, 3);
  assert.deepEqual(s.floors, [{ id: "s01", total: 3, avgMerged: 1 }, { id: "s02", total: 2, avgMerged: 1 / 3 }]);
  assert.equal(s.catchRate, (0.75 + 0.5) / 2);
  assert.equal(s.catchRateStudents, 2);
  assert.equal(s.avgGain, 4);
  assert.equal(s.gainStudents, 2);
  assert.equal(s.avgXp, 2000 / 3);
  assert.equal(classSummary([]).catchRate, null);
});

test("sorting puts missing values last in both directions", () => {
  const rows = [
    { report: report({ name: "Ana" }) },
    { report: report({ name: "Ben", skillsCheck: undefined }) },
    { report: report({ name: "Cy", skillsCheck: { baseline: { score: 2, total: 12 }, final: { score: 12, total: 12 } } }) },
  ];
  assert.deepEqual(sortStudents(rows, "gain", "desc").map((r) => r.report.name), ["Cy", "Ana", "Ben"]);
  assert.deepEqual(sortStudents(rows, "gain", "asc").map((r) => r.report.name), ["Ana", "Cy", "Ben"]);
  assert.deepEqual(sortStudents(rows, "name", "desc").map((r) => r.report.name), ["Cy", "Ben", "Ana"]);
});

test("CSV export: header, one row per student, safe cells", () => {
  const csv = classCsv([report(), report({ name: "=cmd()" })], (id) => (id === "s01" ? "Floor 1" : "Floor 2"));
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Name,Class,Last active,Report date,XP,Tickets merged,Floor 1 merged,Floor 2 merged,Byte bugs caught/);
  assert.equal(lines[1], "Ana,CS1-BLUE,2026-11-18,2026-11-20,1840,3,2,1,3,1,75,2,0,2,3,5,11,12,6");
  assert.ok(lines[2].startsWith("'=cmd()"));
  assert.equal(csvCell('a "b", c'), '"a ""b"", c"');
  assert.equal(csvCell(null), "");
});

test("teacher store parsing survives garbage", () => {
  assert.deepEqual(parseTeacherStore(null), { classes: {} });
  assert.deepEqual(parseTeacherStore("nope"), { classes: {} });
  assert.deepEqual(parseTeacherStore('{"lastClass":"CS1","classes":{"CS1":["x",2],"bad/":[]}}'), { lastClass: "CS1", classes: { CS1: ["x"] } });
  const code = encodeReport(report());
  assert.equal(studentsFromCodes([code, "junk", code], "CS1-BLUE").length, 1);
});
