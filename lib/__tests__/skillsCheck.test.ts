import assert from "node:assert/strict";
import { test } from "node:test";
import {
  certificateDate,
  certificateShareText,
  certificateStatus,
  comparisonText,
  improvement,
  makeResult,
  nextAttempt,
  scoreAnswers,
  skillsCardState,
  skillsShareText,
  type SkillsCheckProgress,
  type SkillsCheckResult,
} from "../game/skillsCheck.ts";
import { finalSeasonIndex, previousChainSeasonIndex, previousTicketId, seasonGate, seasonOpen } from "../content/order.ts";

const items = Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, answer: i % 3 }));
const result = (score: number, takenAt = "2026-11-01T10:00:00.000Z"): SkillsCheckResult => ({
  score,
  total: 12,
  answers: {},
  takenAt,
  ticketsSolved: 0,
});

test("scoring counts only the right picks", () => {
  assert.equal(scoreAnswers(items, {}), 0);
  const allRight = Object.fromEntries(items.map((i) => [i.id, i.answer]));
  assert.equal(scoreAnswers(items, allRight), 12);
  assert.equal(scoreAnswers(items, { ...allRight, q0: 2, q1: 0 }), 10);
  // Unknown ids and missing answers are simply not right.
  assert.equal(scoreAnswers(items, { nope: 0, q3: 0 }), 1);
});

test("a result records score, total, answers and when", () => {
  const r = makeResult(items, { q0: 0, q1: 0 }, new Date("2026-11-20T09:00:00Z"), 7);
  assert.deepEqual(r, { score: 1, total: 12, answers: { q0: 0, q1: 0 }, takenAt: "2026-11-20T09:00:00.000Z", ticketsSolved: 7 });
});

test("the baseline comes first, the final once the final exam is open; each is taken once", () => {
  assert.equal(nextAttempt(undefined, false), "baseline");
  assert.equal(nextAttempt({ baselineSkipped: true }, false), "baseline"); // still possible from the page
  assert.equal(nextAttempt({ baseline: result(5) }, false), null);
  assert.equal(nextAttempt({ baseline: result(5) }, true), "final");
  assert.equal(nextAttempt(undefined, true), "final"); // skipped the baseline: the final stands alone
  assert.equal(nextAttempt({ baseline: result(5), final: result(11) }, true), null);
});

test("the HQ card: offer, skip, baseline done, final offer, done", () => {
  assert.equal(skillsCardState(undefined, false), "offer-baseline");
  assert.equal(skillsCardState({ baselineSkipped: true }, false), "hidden");
  assert.equal(skillsCardState({ baseline: result(5) }, false), "baseline-done");
  assert.equal(skillsCardState({ baselineSkipped: true }, true), "offer-final");
  assert.equal(skillsCardState({ baseline: result(5) }, true), "offer-final");
  assert.equal(skillsCardState({ baseline: result(5), final: result(11) }, true), "done");
});

test("comparison line and improvement", () => {
  assert.equal(comparisonText(undefined), null);
  assert.equal(comparisonText({ baselineSkipped: true }), null);
  assert.equal(comparisonText({ baseline: result(5) }), "Baseline 5/12");
  assert.equal(comparisonText({ final: result(11) }), "Final 11/12");
  assert.equal(comparisonText({ baseline: result(5), final: result(11) }), "Baseline 5/12 → Final 11/12");
  assert.equal(improvement({ baseline: result(5), final: result(11) }), 6);
  assert.equal(improvement({ final: result(11) }), null);
});

test("share text names the scores, the gain and the link", () => {
  const sc: SkillsCheckProgress = { baseline: result(5), final: result(11) };
  const text = skillsShareText(sc, "https://example.com/devjourney/");
  assert.match(text, /^My DevJourney skills check: Baseline 5\/12 → Final 11\/12 \(\+6\)/);
  assert.ok(text.endsWith("https://example.com/devjourney/"));
  assert.doesNotMatch(skillsShareText({ baseline: result(5) }, "u"), /\(\+/);
});

test("the certificate needs every final ticket and the final check", () => {
  const tickets = [
    { id: "a", title: "Review", solved: true },
    { id: "b", title: "Incident", solved: false },
  ];
  const locked = certificateStatus(tickets, { baseline: result(5) });
  assert.equal(locked.eligible, false);
  assert.deepEqual(locked.missing, ["Final exam: Incident", "The final skills check"]);
  const solved = tickets.map((t) => ({ ...t, solved: true }));
  assert.deepEqual(certificateStatus(solved, { final: result(9) }), { eligible: true, missing: [] });
  // No final exam in the content: never eligible.
  assert.equal(certificateStatus([], { final: result(9) }).eligible, false);
});

test("the certificate date is the latest merge or final check", () => {
  const sc = { final: result(9, "2026-11-03T12:00:00.000Z") };
  assert.equal(certificateDate(["2026-11-02T12:00:00.000Z", undefined, "2026-11-04T08:00:00.000Z"], sc), "2026-11-04T08:00:00.000Z");
  assert.equal(certificateDate([], sc), "2026-11-03T12:00:00.000Z");
  assert.equal(certificateDate([], undefined), null);
});

test("certificate share text uses the name, or 'I' for the default name", () => {
  const sc = { baseline: result(4), final: result(10) };
  assert.match(certificateShareText("Ana", sc, { merged: 3, total: 3 }, "u"), /^Ana passed "Byte's Week Alone"/);
  const mine = certificateShareText("You", sc, { merged: 3, total: 3 }, "https://x/");
  assert.match(mine, /^I passed/);
  assert.match(mine, /Human in the loop: verified/);
  assert.match(mine, /3\/3 exam tickets, no hints, skills check Baseline 4\/12 → Final 10\/12/);
  assert.ok(mine.endsWith("https://x/"));
});

// ---------- unlocking (lib/content/order.ts) ----------

const t = (...ids: string[]) => ids.map((id) => ({ id }));
const seasons = [
  { id: "s01", tickets: t("a1", "a2") },
  { id: "s02", tickets: t("b1") },
  { id: "s99", chain: false, final: true, tickets: t("f1", "f2") },
];

test("a season opens when the nearest on-chain season before it is complete", () => {
  const solved = new Set(["a1", "a2"]);
  const isSolved = (id: string) => solved.has(id);
  assert.equal(seasonOpen(seasons, 0, isSolved), true);
  assert.equal(seasonOpen(seasons, 1, isSolved), true);
  assert.equal(seasonOpen(seasons, 2, isSolved), false);
  solved.add("b1");
  assert.equal(seasonOpen(seasons, 2, isSolved), true);
  assert.deepEqual(seasonGate(seasons, 2), ["b1"]);
});

test("the final exam follows whatever on-chain season comes last (a new Season 5 included)", () => {
  const withS5 = [...seasons.slice(0, 2), { id: "s05", tickets: t("e1", "e2") }, seasons[2]];
  assert.equal(previousTicketId(withS5, "f1"), "e2");
  assert.deepEqual(seasonGate(withS5, 3), ["e1", "e2"]);
  assert.equal(finalSeasonIndex(withS5), 3);
});

test("previous ticket: inside a season, across seasons, skipping off-chain seasons", () => {
  assert.equal(previousTicketId(seasons, "a1"), null);
  assert.equal(previousTicketId(seasons, "a2"), "a1");
  assert.equal(previousTicketId(seasons, "b1"), "a2");
  assert.equal(previousTicketId(seasons, "f1"), "b1");
  assert.equal(previousTicketId(seasons, "f2"), "f1");
  assert.equal(previousTicketId(seasons, "nope"), null);
  // An on-chain season after an off-chain side quest continues from the last on-chain one.
  const side = [seasons[0], { id: "side", chain: false, tickets: t("x1") }, { id: "s03", tickets: t("c1") }];
  assert.equal(previousTicketId(side, "c1"), "a2");
  assert.equal(previousChainSeasonIndex(side, 2), 0);
  assert.equal(finalSeasonIndex(side), -1);
});
