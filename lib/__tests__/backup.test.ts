import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backupFileJson,
  backupFileName,
  backupReminderDue,
  backupSummary,
  decodeBackupCode,
  encodeBackupCode,
  parseBackupMeta,
  previewLine,
  readBackupText,
  savedAgoText,
  validateProgress,
} from "../progress/backup.ts";
import { base64urlToText, crc32, textToBase64url } from "../progress/codec.ts";
import type { Progress } from "../progress/store";

const NOW = new Date("2026-11-20T12:00:00.000Z");

function sample(): Progress {
  return {
    version: 1,
    playerName: "Ana 🚀",
    startedAt: "2026-11-01T09:00:00.000Z",
    activeDays: ["2026-11-01", "2026-11-17"],
    onboarded: true,
    warmupLog: [{ id: "w1", day: "2026-11-17", correct: true }],
    skillsCheck: { baseline: { score: 5, total: 12, answers: { a: 1 }, takenAt: "2026-11-01T10:00:00.000Z", ticketsSolved: 0 } },
    tickets: {
      "s01-t01": {
        code: { "app.py": "def hello():\n    return \"héllo\"\n".repeat(40) },
        runs: 2, hintsUsed: 0, solved: true, solvedAt: "2026-11-01T10:00:00.000Z", solveXp: 125,
        quizFirstPick: [0, null], quizDone: true, quizFirstTryCorrect: 1, quizXp: 15,
        byteSuggestion: { decision: "reject", correct: false, runsAtDecision: 1 },
      },
      "s01-t02": {
        code: {}, runs: 1, hintsUsed: 1, solved: false, solveXp: 0, quizFirstPick: [], quizDone: false, quizFirstTryCorrect: 0, quizXp: 0,
      },
    },
  };
}

test("codec: base64url and CRC-32 round trip unicode", () => {
  const text = "héllo 🚀 world";
  assert.equal(base64urlToText(textToBase64url(text)), text);
  assert.doesNotMatch(textToBase64url("???>>>"), /[+/=]/);
  assert.equal(crc32("123456789"), "cbf43926"); // the standard CRC-32 check value
  assert.equal(base64urlToText("not base64!"), null);
});

test("backup code round trips (compressed and plain)", async () => {
  for (const compress of [true, false]) {
    const code = await encodeBackupCode(sample(), NOW, { compress });
    assert.match(code, compress ? /^DJB1\.z\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/ : /^DJB1\.j\./);
    const back = await decodeBackupCode(`  ${code.slice(0, 20)}\n${code.slice(20)}  `);
    assert.ok(back.ok, back.ok ? "" : back.error);
    assert.deepEqual(back.progress, sample());
    assert.equal(back.exportedAt, NOW.toISOString());
  }
});

test("compression makes the code much shorter", async () => {
  const z = await encodeBackupCode(sample(), NOW);
  const j = await encodeBackupCode(sample(), NOW, { compress: false });
  assert.ok(z.length * 3 < j.length, `${z.length} vs ${j.length}`);
});

test("bad codes are rejected with a clear message", async () => {
  const code = await encodeBackupCode(sample(), NOW);
  const err = async (text: string) => {
    const r = await decodeBackupCode(text);
    assert.equal(r.ok, false);
    return r.ok ? "" : r.error;
  };
  assert.match(await err(""), /Paste a backup code/);
  assert.match(await err("hello world"), /doesn't look like a DevJourney backup/);
  assert.match(await err("DJR1.abc.12345678"), /class report code/);
  assert.match(await err("DJB2.z.abc.12345678"), /newer version/);
  assert.match(await err(code.slice(0, -13) + code.slice(-9)), /damaged/);
  const mid = Math.floor(code.length / 2);
  const flipped = code.slice(0, mid) + (code[mid] === "A" ? "B" : "A") + code.slice(mid + 1);
  assert.match(await err(flipped), /checksum/);
  assert.match(await err(code.split(".").slice(0, 3).join(".")), /cut off/);
});

test("backup file round trips and detects edits", async () => {
  const file = backupFileJson(sample(), NOW);
  const ok = await readBackupText(file);
  assert.ok(ok.ok);
  assert.deepEqual(ok.progress, sample());
  const edited = file.replace('"solveXp": 125', '"solveXp": 9999');
  const bad = await readBackupText(edited);
  assert.equal(bad.ok, false);
  assert.match(bad.ok ? "" : bad.error, /changed after it was saved/);
  assert.equal(backupFileName(NOW), "devjourney-progress-2026-11-20.json");
  assert.match((await readBackupText("{ not json")).ok ? "" : "invalid", /invalid/);
});

test("a code pasted into a file is read too", async () => {
  const code = await encodeBackupCode(sample(), NOW);
  const r = await readBackupText(`${code}\n`);
  assert.ok(r.ok);
});

test("old-format progress (missing optional fields) imports with defaults", async () => {
  const old = {
    version: 1,
    playerName: "Old Save",
    startedAt: "2026-01-01T00:00:00.000Z",
    activeDays: ["2026-01-01"],
    warmups: { "2026-01-01": { id: "w1", correct: true } },
    tickets: { "s01-t01": { code: {}, runs: 1, hintsUsed: 0, solved: true, solveXp: 100, quizFirstPick: [0], quizDone: true, quizXp: 15 } },
  };
  const r = await readBackupText(JSON.stringify(old)); // a raw localStorage dump
  assert.ok(r.ok);
  assert.equal(r.progress.tickets["s01-t01"].quizFirstTryCorrect, 0);
  assert.deepEqual(r.progress.warmups, old.warmups); // kept for the store to migrate
  assert.equal(r.exportedAt, null);

  const minimal = validateProgress({ tickets: { a: { solved: true } } });
  assert.ok(minimal.ok);
  assert.equal(minimal.progress.playerName, "You");
  assert.deepEqual(minimal.progress.activeDays, []);
  assert.equal(minimal.progress.tickets.a.runs, 0);
  assert.deepEqual(minimal.progress.tickets.a.code, {});

  const future = validateProgress({ ...sample(), someNewThing: { x: 1 } });
  assert.ok(future.ok);
  assert.deepEqual((future.progress as unknown as { someNewThing: unknown }).someNewThing, { x: 1 });
});

test("invalid shapes are rejected", () => {
  const fails = (v: unknown, re: RegExp) => {
    const r = validateProgress(v);
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, re);
  };
  fails(null, /no progress/);
  fails({ version: 1 }, /no tickets/);
  fails({ version: 7, tickets: {} }, /newer version/);
  fails({ tickets: {}, activeDays: ["yesterday"] }, /activeDays/);
  fails({ tickets: { a: { solved: "yes" } } }, /ticket a: "solved"/);
  fails({ tickets: { a: { code: { "x.py": 3 } } } }, /"code"/);
  fails({ tickets: { a: [] } }, /not an object/);
});

test("preview line", () => {
  const s = backupSummary(sample());
  assert.equal(s.ticketsMerged, 1);
  assert.equal(s.lastActive, "2026-11-17");
  assert.equal(previewLine(s, 1840, "2026-11-17T11:00:00.000Z", NOW), "1 ticket merged, 1840 XP, saved 3 days ago");
  assert.equal(previewLine({ ...s, ticketsMerged: 26 }, 0, null, NOW), "26 tickets merged, 0 XP");
  assert.equal(savedAgoText(NOW.toISOString(), NOW), "saved today");
  assert.equal(savedAgoText("2026-11-19T11:00:00.000Z", NOW), "saved yesterday");
});

test("backup reminder: after 7 days with progress, snoozed by dismissing", () => {
  const base = { ticketsMerged: 3, startedAt: "2026-11-01T00:00:00.000Z", now: NOW };
  assert.equal(backupReminderDue({ ...base, meta: {} }), true);
  assert.equal(backupReminderDue({ ...base, ticketsMerged: 0, meta: {} }), false);
  assert.equal(backupReminderDue({ ...base, startedAt: "2026-11-18T00:00:00.000Z", meta: {} }), false);
  assert.equal(backupReminderDue({ ...base, meta: { lastBackupAt: "2026-11-15T00:00:00.000Z" } }), false);
  assert.equal(backupReminderDue({ ...base, meta: { lastBackupAt: "2026-11-10T00:00:00.000Z" } }), true);
  assert.equal(backupReminderDue({ ...base, meta: { dismissedAt: "2026-11-19T00:00:00.000Z" } }), false);
  assert.equal(backupReminderDue({ ...base, meta: { dismissedAt: "2026-11-05T00:00:00.000Z" } }), true);
  assert.deepEqual(parseBackupMeta('{"lastBackupAt":"x","dismissedAt":5}'), { lastBackupAt: "x" });
  assert.deepEqual(parseBackupMeta("garbage"), {});
});
