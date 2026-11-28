import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assembleParsons,
  BREAK_IT_XP,
  breakItFeedback,
  breakItRequest,
  callPreview,
  formatKey,
  formatsXp,
  hasTaskFormats,
  moveItem,
  normalizeOutput,
  PARSONS_RETRY_XP,
  PARSONS_XP,
  parsonsRequest,
  parsonsXp,
  PREDICT_XP,
  predictionMatches,
  recordAttempt,
  recordPrediction,
  shuffleParsons,
  usedDistractors,
} from "../game/formats.ts";
import {
  byteXp,
  CATCH_XP,
  decisionRight,
  reasonOk,
  suggestionRewardXp,
  TRUST_XP,
  type ByteDecision,
} from "../game/byte.ts";
import { shuffledOrder } from "../game/shuffle.ts";

test("predictions: spacing at line ends and runs of spaces don't matter; case and quotes do", () => {
  assert.equal(normalizeOutput("None\n2\n\n"), "None\n2");
  assert.equal(normalizeOutput("\r\na  \r\nb\n"), "a\nb");
  assert.ok(predictionMatches("None\n2", "None\n2"));
  assert.ok(predictionMatches("  None  \n 2\n", "None\n2"));
  assert.ok(predictionMatches("[333,  333, 333]", "[333, 333, 333]"));
  assert.ok(!predictionMatches("none\n2", "None\n2"));
  assert.ok(!predictionMatches("'Ana'", "Ana"));
  assert.ok(!predictionMatches("None", "None\n2"));
  assert.ok(!predictionMatches("[333,333,333]", "[333, 333, 333]"), "a missing space inside a line is a different output");
});

test("predict XP: +10 for a right first prediction, nothing (and no penalty) otherwise", () => {
  const right = recordPrediction(undefined, "333", true);
  assert.deepEqual(right, { kind: "predict", attempts: 1, done: true, prediction: "333", correct: true, xp: PREDICT_XP });
  const wrong = recordPrediction(undefined, "334", false);
  assert.equal(wrong.xp, 0);
  // Only the first prediction counts.
  assert.equal(recordPrediction(wrong, "333", true), wrong);
  assert.equal(PREDICT_XP, 10);
});

test("break_it XP: +15 once a counterexample is found, however many tries it took", () => {
  let rec = recordAttempt("break_it", undefined, false);
  assert.deepEqual(rec, { kind: "break_it", attempts: 1, done: false, xp: 0 });
  rec = recordAttempt("break_it", rec, false);
  rec = recordAttempt("break_it", rec, true, { input: "1000, 3" });
  assert.deepEqual(rec, { kind: "break_it", attempts: 3, done: true, xp: BREAK_IT_XP, input: "1000, 3" });
  // Done is final: more tries can't farm XP.
  assert.equal(recordAttempt("break_it", rec, true, { input: "1, 3" }), rec);
  assert.equal(BREAK_IT_XP, 15);
});

test("parsons XP: +15 within two checks, +10 after that, never negative", () => {
  assert.equal(parsonsXp(1), PARSONS_XP);
  assert.equal(parsonsXp(2), PARSONS_XP);
  assert.equal(parsonsXp(3), PARSONS_RETRY_XP);
  assert.equal(parsonsXp(40), PARSONS_RETRY_XP);
  let rec = recordAttempt("parsons", undefined, false);
  rec = recordAttempt("parsons", rec, false);
  rec = recordAttempt("parsons", rec, true, { order: [2, 0, 1] });
  assert.equal(rec.xp, PARSONS_RETRY_XP);
  assert.deepEqual(rec.order, [2, 0, 1]);
  assert.equal(recordAttempt("parsons", undefined, true, { order: [0] }).xp, PARSONS_XP);
});

test("formatsXp sums a ticket's format records; old saves without formats are worth 0", () => {
  assert.equal(formatsXp(undefined), 0);
  assert.equal(formatsXp({}), 0);
  assert.equal(
    formatsXp({
      [formatKey("predict", 0)]: recordPrediction(undefined, "x", true),
      [formatKey("break_it", 0)]: recordAttempt("break_it", undefined, true),
      [formatKey("parsons", 0)]: recordAttempt("parsons", undefined, false),
    }),
    PREDICT_XP + BREAK_IT_XP,
  );
  assert.equal(formatKey("parsons", 1), "parsons:1");
});

test("hasTaskFormats", () => {
  assert.equal(hasTaskFormats({}), false);
  assert.equal(hasTaskFormats({ formats: { predict: [], breakIt: [], parsons: [] } }), false);
  assert.equal(
    hasTaskFormats({ formats: { predict: [{ code: "print(1)", question: "?", answer: "1", explain: "." }], breakIt: [], parsons: [] } }),
    true,
  );
});

test("break_it: request, call preview and feedback", () => {
  const task = { code: "def f(x): ...", helpers: "", call: "split_bill({input})", check: "ok({input}, result)", crashCounts: true };
  assert.deepEqual(breakItRequest(task, "1000, 3"), {
    kind: "break_it",
    code: "def f(x): ...",
    helpers: "",
    call: "split_bill({input})",
    check: "ok({input}, result)",
    input: "1000, 3",
    crash_counts: true,
  });
  assert.equal(callPreview("split_bill({input})", " 1000, 3 "), "split_bill(1000, 3)");
  assert.equal(callPreview("split_bill({input})", ""), "split_bill(…)");

  const broken = breakItFeedback({ status: "broken", message: "", result: "[333, 333, 333]", stdout: "" }, "miss");
  assert.equal(broken.tone, "good");
  assert.match(broken.text, /\[333, 333, 333\].*breaks the spec/);
  const crashBroken = breakItFeedback({ status: "broken", message: "Byte's code crashed: IndexError: x", result: null, stdout: "" }, "");
  assert.match(crashBroken.text, /^Byte's code crashed: IndexError: x\. That breaks the spec\.$/);
  const holds = breakItFeedback({ status: "holds", message: "", result: "[300, 300, 300]", stdout: "" }, "Try another total.");
  assert.equal(holds.tone, "neutral");
  assert.match(holds.text, /meets the spec\. Try another total\.$/);
  assert.equal(breakItFeedback({ status: "crashed", message: "Byte's code crashed: ZeroDivisionError", result: null, stdout: "" }, "").tone, "warn");
  assert.equal(breakItFeedback({ status: "invalid", message: "Use plain values", result: null, stdout: "" }, "").text, "Use plain values");
});

const LINES = ["def late_orders(deliveries):", "    late = []", "    for order_id, minutes in deliveries:", "        if minutes > 45:", "            late.append(order_id)", "    return late"];
const DISTRACTORS = [
  { line: "        if minutes >= 45:", explain: "45 is on time." },
  { line: "            late = late.append(order_id)", explain: "append returns None." },
];

test("shuffleParsons: every line once, stable per seed, and never already solved", () => {
  const n = LINES.length + DISTRACTORS.length;
  const blocks = shuffleParsons(LINES, DISTRACTORS, shuffledOrder(n, "s03-t02:parsons:0"));
  assert.equal(blocks.length, n);
  assert.deepEqual(blocks.map((b) => b.id), [...Array(n).keys()]);
  assert.deepEqual([...blocks.map((b) => b.text)].sort(), [...LINES, ...DISTRACTORS.map((d) => d.line)].sort());
  // Only distractors carry an explanation.
  assert.deepEqual(blocks.filter((b) => b.explain).map((b) => b.text).sort(), DISTRACTORS.map((d) => d.line).sort());
  assert.deepEqual(shuffleParsons(LINES, DISTRACTORS, shuffledOrder(n, "s03-t02:parsons:0")), blocks);

  // The identity permutation would hand over the answer: it is rotated.
  const fromIdentity = shuffleParsons(LINES, [], [0, 1, 2, 3, 4, 5]);
  assert.notDeepEqual(fromIdentity.map((b) => b.text), LINES);
  // Even with distractors in front, the correct lines never come out in order.
  for (let seed = 0; seed < 200; seed++) {
    const out = shuffleParsons(LINES, DISTRACTORS, shuffledOrder(n, `seed-${seed}`));
    const correct = out.map((b) => b.text).filter((t) => LINES.includes(t));
    assert.notDeepEqual(correct, LINES, `seed-${seed}`);
  }
});

test("assembleParsons / usedDistractors / parsonsRequest", () => {
  const blocks = [
    { id: 0, text: "    return x" },
    { id: 1, text: "def f(x):" },
    { id: 2, text: "    return x + 1", explain: "Off by one." },
  ];
  assert.equal(assembleParsons(blocks, [1, 0]), "def f(x):\n    return x");
  assert.deepEqual(usedDistractors(blocks, [1, 0]), []);
  assert.deepEqual(usedDistractors(blocks, [1, 2]).map((b) => b.id), [2]);
  assert.deepEqual(parsonsRequest({ check: "assert f(1) == 1" }, blocks, [1, 0]), {
    kind: "parsons",
    program: "def f(x):\n    return x",
    check: "assert f(1) == 1",
  });
  assert.equal(parsonsRequest({ check: "", expectedOutput: "1" }, blocks, [1]).expected_output, "1");
});

test("moveItem moves one step and ignores moves off the ends", () => {
  assert.deepEqual(moveItem([1, 2, 3], 1, -1), [2, 1, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 1, 1), [1, 3, 2]);
  const list = [1, 2, 3];
  assert.equal(moveItem(list, 0, -1), list);
  assert.equal(moveItem(list, 2, 1), list);
});

// ---------- Byte "why?" (decide before evidence) ----------

const rec = (decision: ByteDecision, correct: boolean, reasonCorrect?: boolean) =>
  reasonCorrect === undefined
    ? { decision, correct, runsAtDecision: 0 }
    : { decision, correct, runsAtDecision: 0, reason: reasonCorrect ? 0 : 1, reasonCorrect };

test("decisionRight: accept a right suggestion, reject or fix a wrong one", () => {
  assert.equal(decisionRight("accept", true), true);
  assert.equal(decisionRight("accept", false), false);
  assert.equal(decisionRight("reject", false), true);
  assert.equal(decisionRight("edit", false), true);
  assert.equal(decisionRight("reject", true), false);
});

test("why: XP only for the right call AND the right reason; old records (no reason) unchanged", () => {
  const solvedAfterRun = { runs: 1, solved: true };
  // No "why" asked: as before.
  assert.equal(reasonOk(rec("reject", false)), true);
  assert.equal(suggestionRewardXp(rec("reject", false), { runs: 0, solved: false }), CATCH_XP);
  // Right call + right reason.
  assert.equal(suggestionRewardXp(rec("reject", false, true), { runs: 0, solved: false }), CATCH_XP);
  assert.equal(suggestionRewardXp(rec("accept", true, true), solvedAfterRun), TRUST_XP);
  // Right call, wrong reason: nothing (and nothing lost).
  assert.equal(reasonOk(rec("reject", false, false)), false);
  assert.equal(suggestionRewardXp(rec("reject", false, false), { runs: 0, solved: false }), 0);
  assert.equal(suggestionRewardXp(rec("accept", true, false), solvedAfterRun), 0);
  // Wrong call, right reason: nothing either.
  assert.equal(suggestionRewardXp(rec("reject", true, true), { runs: 0, solved: false }), 0);
  // Accepting a right suggestion pays only once a run checked it.
  assert.equal(suggestionRewardXp(rec("accept", true, true), { runs: 0, solved: false }), 0);
  assert.equal(byteXp({ runs: 0, solved: false, byteSuggestion: rec("reject", false, false) }), 0);
  assert.equal(byteXp({ runs: 0, solved: false, byteSuggestion: rec("reject", false, true) }), CATCH_XP);
});
