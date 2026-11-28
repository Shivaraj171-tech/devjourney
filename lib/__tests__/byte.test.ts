import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applySuggestion,
  BEST_PROMPT_XP,
  byteXp,
  CATCH_XP,
  hitlAccuracy,
  hitlScore,
  hitlSummary,
  promptXp,
  suggestionLine,
  suggestionOutcome,
  TRUST_XP,
  type ByteDecision,
  type ByteTicketState,
} from "../game/byte.ts";
import { BADGES, type BadgeContext } from "../game/rules.ts";

const rec = (decision: ByteDecision, correct: boolean, runsAtDecision = 0) => ({ decision, correct, runsAtDecision });

test("applySuggestion replaces the first match, or returns null when the text is gone", () => {
  const code = "def f(xs):\n    for i in range(len(xs) - 1):\n        pass\n";
  assert.equal(
    applySuggestion(code, "range(len(xs) - 1)", "range(len(xs))"),
    "def f(xs):\n    for i in range(len(xs)):\n        pass\n",
  );
  assert.equal(applySuggestion(code, "while True:", "x"), null);
  assert.equal(applySuggestion("a a", "a", "b"), "b a");
  assert.equal(suggestionLine(code, "    for i"), 2);
  assert.equal(suggestionLine(code, "nope"), null);
});

test("suggestionOutcome: reject", () => {
  assert.equal(suggestionOutcome(rec("reject", false), { runs: 0, solved: false }), "caught");
  assert.equal(suggestionOutcome(rec("reject", true), { runs: 5, solved: true }), "doubted");
});

test("suggestionOutcome: accept is only judged after the next test run", () => {
  assert.equal(suggestionOutcome(rec("accept", false, 2), { runs: 2, solved: false }), "pending");
  assert.equal(suggestionOutcome(rec("accept", false, 2), { runs: 3, solved: false }), "waved-through");
  // Fixing it afterwards still counts as having waved it through: the lesson is to check BEFORE accepting.
  assert.equal(suggestionOutcome(rec("accept", false, 2), { runs: 4, solved: true }), "waved-through");
  assert.equal(suggestionOutcome(rec("accept", true, 0), { runs: 0, solved: false }), "pending");
  assert.equal(suggestionOutcome(rec("accept", true, 0), { runs: 1, solved: true }), "trusted");
});

test("suggestionOutcome: edit a wrong suggestion counts as caught once the tests pass", () => {
  assert.equal(suggestionOutcome(rec("edit", false, 0), { runs: 2, solved: false }), "pending");
  assert.equal(suggestionOutcome(rec("edit", false, 0), { runs: 3, solved: true }), "caught");
  assert.equal(suggestionOutcome(rec("edit", true, 1), { runs: 2, solved: true }), "trusted");
});

test("Byte XP: small bonuses, never a penalty", () => {
  assert.equal(byteXp({ runs: 0, solved: false }), 0);
  assert.equal(byteXp({ runs: 0, solved: false, byteSuggestion: rec("reject", false) }), CATCH_XP);
  assert.equal(byteXp({ runs: 1, solved: true, byteSuggestion: rec("accept", true) }), TRUST_XP);
  assert.equal(byteXp({ runs: 1, solved: false, byteSuggestion: rec("accept", false) }), 0);
  assert.equal(byteXp({ runs: 0, solved: false, byteSuggestion: rec("reject", true) }), 0);
  assert.equal(promptXp({ firstPick: 2, best: true }), BEST_PROMPT_XP);
  assert.equal(promptXp({ firstPick: 0, best: false }), 0);
  assert.equal(promptXp(undefined), 0);
  assert.equal(
    byteXp({ runs: 0, solved: false, byteSuggestion: rec("reject", false), bytePrompt: { firstPick: 1, best: true } }),
    CATCH_XP + BEST_PROMPT_XP,
  );
  assert.ok(TRUST_XP > 0);
});

test("Byte XP: a right call pays the same whether Byte was right or wrong", () => {
  // Rejecting by habit must not out-earn checking: catching a wrong suggestion and
  // checking-then-trusting a right one are worth exactly the same.
  assert.equal(CATCH_XP, TRUST_XP);
  const caught = byteXp({ runs: 0, solved: false, byteSuggestion: rec("reject", false) });
  const trusted = byteXp({ runs: 1, solved: true, byteSuggestion: rec("accept", true) });
  const trustedByEdit = byteXp({ runs: 2, solved: true, byteSuggestion: rec("edit", true, 1) });
  assert.equal(caught, trusted);
  assert.equal(trusted, trustedByEdit);
  // ...and with a "why": the right call AND the right reason, either way.
  const withReason = (decision: ByteDecision, correct: boolean, reasonCorrect: boolean) => ({ ...rec(decision, correct), reason: 0, reasonCorrect });
  assert.equal(
    byteXp({ runs: 0, solved: false, byteSuggestion: withReason("reject", false, true) }),
    byteXp({ runs: 1, solved: true, byteSuggestion: withReason("accept", true, true) }),
  );
  assert.equal(byteXp({ runs: 1, solved: true, byteSuggestion: withReason("accept", true, false) }), 0);
  assert.equal(byteXp({ runs: 0, solved: false, byteSuggestion: withReason("reject", false, false) }), 0);
});

test("Byte XP: a partial suggestion is a correct one (taking and checking it is trusted)", () => {
  // partial: true only goes with correct: true, so the record holds correct: true.
  assert.equal(suggestionOutcome(rec("edit", true, 0), { runs: 1, solved: false }), "trusted");
  assert.equal(suggestionOutcome(rec("accept", true, 0), { runs: 1, solved: false }), "trusted");
  assert.equal(suggestionOutcome(rec("reject", true), { runs: 1, solved: false }), "doubted");
});

const sample: ByteTicketState[] = [
  { runs: 0, solved: false, byteSuggestion: rec("reject", false) }, // caught
  { runs: 3, solved: true, byteSuggestion: rec("edit", false) }, // caught
  { runs: 2, solved: false, byteSuggestion: rec("accept", false, 1) }, // waved through
  { runs: 1, solved: true, byteSuggestion: rec("accept", true) }, // trusted
  { runs: 0, solved: false, byteSuggestion: rec("accept", true) }, // pending
  { runs: 0, solved: false, byteSuggestion: rec("reject", true), bytePrompt: { firstPick: 0, best: true } }, // doubted
  { runs: 0, solved: false, bytePrompt: { firstPick: 1, best: false } },
  { runs: 1, solved: true },
];

test("hitlScore counts every kind of decision", () => {
  assert.deepEqual(hitlScore(sample), {
    caught: 2, wavedThrough: 1, trusted: 1, doubted: 1, pending: 1, bestPrompts: 1, promptsTried: 2, practice: 0,
  });
  assert.deepEqual(hitlScore([]), { caught: 0, wavedThrough: 0, trusted: 0, doubted: 0, pending: 0, bestPrompts: 0, promptsTried: 0, practice: 0 });
});

test("hitlScore leaves tutorial (practice) decisions out", () => {
  const practiceTrap = { ...rec("accept", false), tutorial: true as const };
  const s = hitlScore([
    { runs: 2, solved: true, byteSuggestion: practiceTrap }, // would be "waved through"
    { runs: 2, solved: true, byteSuggestion: { ...rec("reject", false), tutorial: true as const } }, // would be "caught"
    { runs: 0, solved: false, byteSuggestion: rec("reject", false) }, // caught, counts
  ]);
  assert.equal(s.practice, 2);
  assert.equal(s.caught, 1);
  assert.equal(s.wavedThrough, 0);
  assert.equal(hitlSummary(s), "Caught 1 of 1 of Byte's bugs");
  assert.equal(hitlAccuracy(s), 1);
  // Practice rounds still earn their XP.
  assert.equal(byteXp({ runs: 2, solved: true, byteSuggestion: { ...rec("reject", false), tutorial: true } }), CATCH_XP);
});

test("hitlSummary and hitlAccuracy", () => {
  const s = hitlScore(sample);
  assert.equal(hitlSummary(s), "Caught 2 of 3 of Byte's bugs, trusted 1/2 good suggestions, 1/2 best prompts");
  assert.equal(hitlSummary(hitlScore([])), "");
  assert.equal(hitlSummary(hitlScore([{ runs: 0, solved: false, bytePrompt: { firstPick: 0, best: true } }])), "1/1 best prompts");
  // right calls: 2 caught + 1 trusted + 1 best prompt, out of 3 bugs + 2 correct + 2 prompts
  assert.equal(hitlAccuracy(s), 4 / 7);
  assert.equal(hitlAccuracy(hitlScore([])), null);
});

test("badges: Bug Catcher and Prompt Pro", () => {
  const get = (id: string) => BADGES.find((b) => b.id === id)!;
  const ctx = (caught: number, bestPrompts: number): BadgeContext => ({
    solved: [], streak: 0, seasonTicketCounts: {},
    hitl: { caught, wavedThrough: 0, trusted: 0, doubted: 0, pending: 0, bestPrompts, promptsTried: bestPrompts, practice: 0 },
  });
  assert.equal(get("bug-catcher").earned(ctx(2, 0)), false);
  assert.equal(get("bug-catcher").earned(ctx(3, 0)), true);
  assert.equal(get("prompt-pro").earned(ctx(0, 2)), false);
  assert.equal(get("prompt-pro").earned(ctx(0, 3)), true);
  // Callers that don't pass a score never earn them (and don't crash).
  assert.equal(get("bug-catcher").earned({ solved: [], streak: 0, seasonTicketCounts: {} }), false);
});
