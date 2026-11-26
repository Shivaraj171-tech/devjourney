import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FOCUS_BELOW,
  buildProfile,
  collectEvidence,
  conceptKey,
  decay,
  detectHabits,
  focusLine,
  masteryByConcept,
  masteryMap,
  practiceFor,
  recommendedBounties,
  runsToPass,
  type ProfileContent,
  type ProfileTicketMeta,
  type ProfileTicketProgress,
} from "../game/profile.ts";
import type { RunLogEntry } from "../game/runLog.ts";

const TODAY = "2026-11-20";
const at = (day: string, minute = 0) => Date.parse(`${day}T12:${String(minute).padStart(2, "0")}:00`);

const meta = (id: string, number: number, title: string, concept: string, extra: Partial<ProfileTicketMeta> = {}): ProfileTicketMeta => ({
  id,
  number,
  title,
  seasonTitle: "Your First Week",
  concept,
  concepts: [concept],
  type: "bug",
  bounty: false,
  final: false,
  hasLesson: true,
  formats: [],
  boundaryChecks: [],
  requires: null,
  ...extra,
});
const CONTENT: ProfileContent = {
  tickets: [
    meta("t1", 1, "Welcome", "strings"),
    meta("t2", 2, "Menu prices", "numbers"),
    meta("t4", 4, "Cart subtotal", "loops", { concepts: ["numbers", "lists", "loops"], formats: ["trace:0"], boundaryChecks: ["test_last_item_is_counted"] }),
    meta("t6", 6, "Order again", "dictionaries", { concepts: ["loops", "lists", "dictionaries"] }),
    meta("t8", 8, "No promo crash", "none", { concepts: ["conditionals", "dictionaries", "none"] }),
    meta("b5", 5, "First order of the day", "dictionaries", { bounty: true, hasLesson: false, requires: "t6" }),
    meta("b1", 1, "The last stop", "loops", { bounty: true, hasLesson: false, requires: "t4" }),
  ],
  warmups: [
    { id: "w014", title: "Price update", concept: "dictionaries", after: "t6" },
    { id: "w015", title: "Is it on the menu?", concept: "dictionaries", after: "t6" },
    { id: "w017", title: "No delivery note", concept: "None", after: "t8" },
    { id: "w001", title: "Two receipts", concept: "strings", after: "t1" },
  ],
};

const tp = (extra: Partial<ProfileTicketProgress> = {}): ProfileTicketProgress => ({
  runs: 1,
  hintsUsed: 0,
  solved: true,
  solvedAt: `${TODAY}T12:30:00`,
  quizFirstPick: [],
  quizDone: false,
  quizFirstTryCorrect: 0,
  ...extra,
});
const run = (day: string, minute: number, extra: Partial<RunLogEntry>): RunLogEntry => ({
  at: at(day, minute),
  passed: 0,
  total: 4,
  failing: [],
  errors: [],
  changed: true,
  hash: `h${minute}`,
  ...extra,
});
const keyErrorRun = (minute: number, changed = true) =>
  run(TODAY, minute, { passed: 2, failing: ["test_removed_item_is_skipped", "test_only_removed_items_gives_empty_cart"], errors: ["KeyError"], changed, hash: changed ? `h${minute}` : "same" });
const passRun = (minute: number) => run(TODAY, minute, { passed: 4, total: 4 });

/** A learner who hit KeyErrors on ticket 6, missed two dictionary warm-ups, and waved Byte's wrong code through twice. */
function struggler(): Record<string, ProfileTicketProgress> {
  return {
    t1: tp({ byteSuggestion: { decision: "accept", correct: false, runsAtDecision: 0 }, runs: 2, runLog: [run(TODAY, 1, { failing: ["test_greets"], errors: ["AssertionFail"] }), passRun(2)] }),
    t2: tp({ byteSuggestion: { decision: "accept", correct: false, runsAtDecision: 0 }, runs: 2 }),
    t6: tp({ runs: 4, runLog: [keyErrorRun(10), keyErrorRun(11), keyErrorRun(12), passRun(13)] }),
  };
}
const strugglerWarmups = [
  { id: "w014", day: TODAY, correct: false },
  { id: "w015", day: TODAY, correct: false },
  { id: "w001", day: TODAY, correct: true },
];

test("conceptKey: one slug per concept", () => {
  assert.equal(conceptKey("None (no value)"), "none");
  assert.equal(conceptKey("None"), "none");
  assert.equal(conceptKey("dictionaries"), "dictionaries");
});

test("decay: evidence counts half after 21 days", () => {
  assert.equal(decay(TODAY, TODAY), 1);
  assert.ok(Math.abs(decay("2026-10-30", TODAY) - 0.5) < 1e-9);
});

test("runs to pass: from the run log, else the run counter (old saves)", () => {
  assert.equal(runsToPass(tp({ runs: 4, runLog: [keyErrorRun(1), keyErrorRun(2), keyErrorRun(3), passRun(4)] })), 4);
  assert.equal(runsToPass(tp({ runs: 3 })), 3);
  assert.equal(runsToPass(tp({ solved: false, runs: 3 })), null);
  // Solved before logging existed: the counter it is.
  assert.equal(runsToPass(tp({ runs: 5, solvedAt: "2026-11-01T10:00:00", runLog: [passRun(1)] })), 5);
});

test("KeyErrors point at dictionaries, with evidence in plain English", () => {
  const ev = collectEvidence({ tickets: struggler(), warmupLog: strugglerWarmups, content: CONTENT, today: TODAY });
  const errors = ev.filter((e) => e.source === "error");
  assert.equal(errors.length, 3);
  assert.ok(errors.every((e) => e.concept === "dictionaries"));
  const concepts = masteryByConcept(ev, TODAY);
  const dict = concepts.find((c) => c.concept === "dictionaries")!;
  assert.ok(dict.mastery < FOCUS_BELOW, `mastery ${dict.mastery}`);
  assert.ok(dict.because.includes("3 KeyErrors on #6 “Order again”"), dict.because.join(" | "));
  assert.ok(dict.because.includes("missed 2 warm-ups on dictionaries"), dict.because.join(" | "));
});

test("the profile: dictionaries is a focus area, strings is not, habits say 'trusts Byte quickly'", () => {
  const profile = buildProfile({ tickets: struggler(), warmupLog: strugglerWarmups, content: CONTENT, today: TODAY });
  assert.equal(profile.empty, false);
  assert.equal(profile.focus[0].concept, "dictionaries");
  assert.ok(!profile.focus.some((f) => f.concept === "strings" && f.mastery > 0.5));
  const trust = profile.habits.find((h) => h.id === "trusts-byte")!;
  assert.ok(trust, JSON.stringify(profile.habits));
  assert.match(trust.because, /#1, #2/);
  assert.equal(focusLine(profile)!.text, "Focus this week: dictionaries — 3 KeyErrors on #6 “Order again”");
  assert.ok(masteryMap(profile).dictionaries < 0.5);
});

test("a new learner: empty profile, no focus line", () => {
  const profile = buildProfile({ tickets: {}, warmupLog: [], content: CONTENT, today: TODAY });
  assert.equal(profile.empty, true);
  assert.equal(profile.focus.length, 0);
  assert.equal(focusLine(profile), null);
});

test("first-run passes and right warm-ups make a strength", () => {
  const tickets = { t1: tp({ runs: 1, runLog: [passRun(1)], quizDone: true, quizFirstPick: [0, 0], quizFirstTryCorrect: 2 }) };
  const warmups = [{ id: "w001", day: TODAY, correct: true }];
  const profile = buildProfile({ tickets, warmupLog: warmups, content: CONTENT, today: TODAY });
  assert.equal(profile.strengths[0]?.concept, "strings");
  assert.ok(profile.strengths[0].because.some((b) => b.includes("passed #1 “Welcome” on the first run")));
  assert.equal(profile.focus.length, 0);
});

test("recency: the same misses long ago weigh less", () => {
  const old = [
    { id: "w014", day: "2026-08-01", correct: false },
    { id: "w015", day: "2026-08-01", correct: false },
  ];
  const fresh = old.map((w) => ({ ...w, day: TODAY }));
  const m = (log: typeof old) => masteryByConcept(collectEvidence({ tickets: {}, warmupLog: log, content: CONTENT, today: TODAY }), TODAY)[0];
  assert.ok(m(old).mastery > m(fresh).mastery);
  assert.ok(m(old).confidence < 0.2);
});

test("boundary failures point at loops; None crashes at None; timeouts at loops", () => {
  const tickets = {
    t4: tp({ runs: 3, runLog: [run(TODAY, 1, { failing: ["test_last_item_is_counted"], errors: ["AssertionFail"] }), run(TODAY, 2, { failing: ["test_last_item_is_counted"], errors: ["AssertionFail"] }), passRun(3)] }),
    t8: tp({ runs: 2, runLog: [run(TODAY, 4, { failing: ["test_no_code"], errors: ["NoneAttributeError"] }), passRun(5)] }),
    t6: tp({ solved: false, runs: 1, runLog: [run(TODAY, 6, { errors: ["Timeout"] })] }),
  };
  const ev = collectEvidence({ tickets, warmupLog: [], content: CONTENT, today: TODAY }).filter((e) => e.source === "error");
  assert.deepEqual(ev.map((e) => e.concept).sort(), ["loops", "loops", "loops", "none"]);
});

test("re-running the same code is not extra evidence", () => {
  const tickets = { t6: tp({ runs: 4, runLog: [keyErrorRun(1), keyErrorRun(2, false), keyErrorRun(3, false), passRun(4)] }) };
  const ev = collectEvidence({ tickets, warmupLog: [], content: CONTENT, today: TODAY }).filter((e) => e.source === "error");
  assert.equal(ev.length, 1);
});

test("habits: re-runs without changes, debugger, hints, reading errors, edge cases", () => {
  const unchanged = (m: number) => run(TODAY, m, { failing: ["test_x"], errors: ["AssertionFail"], changed: false, hash: "same" });
  const habits = detectHabits(
    {
      t1: tp({ runs: 5, hintsUsed: 2, runLog: [run(TODAY, 1, { failing: ["test_x"], errors: ["AssertionFail"] }), unchanged(2), unchanged(3), unchanged(4), passRun(5)] }),
      t2: tp({ hintsUsed: 1, runLog: [run(TODAY, 6, { failing: ["test_empty_cart_is_zero"], errors: ["AssertionFail"], stepped: true }), passRun(7)] }),
      t4: tp({ hintsUsed: 1, runLog: [run(TODAY, 8, { failing: ["test_last_item_is_counted"], errors: ["AssertionFail"] }), { ...passRun(9), stepped: true }] }),
      t6: tp({
        runLog: [
          { ...keyErrorRun(10), errLine: { file: "app/reorder.py", line: 3, hash: "a" } },
          { ...keyErrorRun(11), editedErrLine: true, errLine: { file: "app/reorder.py", line: 3, hash: "b" } },
          { ...passRun(12), editedErrLine: true },
        ],
      }),
    },
    CONTENT,
  );
  const ids = habits.map((h) => h.id);
  assert.ok(ids.includes("reruns-unchanged"), ids.join());
  assert.ok(ids.includes("uses-debugger"), ids.join());
  assert.ok(ids.includes("leans-on-hints"), ids.join());
  assert.ok(ids.includes("reads-errors"), ids.join());
  assert.ok(ids.includes("misses-edges"), ids.join());
  for (const h of habits) assert.ok(h.because.length > 10, `${h.id} has evidence`);
  // Never shaming: no "bad", "fail", "lazy", "careless" in any habit text.
  for (const h of habits) assert.doesNotMatch(`${h.label} ${h.because} ${h.tip ?? ""}`, /\b(bad|lazy|careless|failure|wrong with you)\b/i);
});

test("habits: checks Byte's work, works without hints", () => {
  const caught = { decision: "reject" as const, correct: false, runsAtDecision: 0 };
  const habits = detectHabits({ t1: tp({ byteSuggestion: caught }), t2: tp({ byteSuggestion: caught }), t4: tp(), t6: tp() }, CONTENT);
  const ids = habits.map((h) => h.id);
  assert.ok(ids.includes("checks-byte"));
  assert.ok(ids.includes("no-hints"));
  assert.ok(!ids.includes("trusts-byte"));
  assert.ok(!ids.includes("doubts-byte"));
});

test("habits: turning down Byte's good suggestions by habit is a tip, not a strength", () => {
  const doubted = { decision: "reject" as const, correct: true, runsAtDecision: 0 };
  const trusted = { decision: "accept" as const, correct: true, runsAtDecision: 0 };
  const habits = detectHabits({ t1: tp({ byteSuggestion: doubted }), t2: tp({ byteSuggestion: doubted }), t4: tp({ byteSuggestion: trusted, runs: 1 }) }, CONTENT);
  const doubts = habits.find((h) => h.id === "doubts-byte");
  assert.ok(doubts, habits.map((h) => h.id).join());
  assert.equal(doubts.tone, "tip");
  assert.match(doubts.because, /2 of the last 3 good suggestions/);
  // Checked and trusted instead: no tip.
  const fine = detectHabits({ t1: tp({ byteSuggestion: trusted, runs: 1 }), t2: tp({ byteSuggestion: trusted, runs: 1 }) }, CONTENT);
  assert.ok(!fine.some((h) => h.id === "doubts-byte"));
});

test("practice made for you: warm-ups, open bounties and lessons for a focus area, only unlocked ones", () => {
  const solved = new Set(["t1", "t2", "t4", "t6"]);
  const p = practiceFor(["dictionaries"], CONTENT, (id) => solved.has(id));
  const items = p.dictionaries;
  assert.ok(items.some((i) => i.kind === "bounty" && i.href === "/ticket/b5/"));
  assert.ok(items.some((i) => i.kind === "warmup" && i.title === "Price update"));
  assert.ok(items.some((i) => i.kind === "lesson" && i.href === "/ticket/t6/#lesson"));
  // Locked things never show: None's warm-up needs t8.
  assert.equal(practiceFor(["none"], CONTENT, (id) => solved.has(id)).none, undefined);
  // Practice formats on tickets that use the concept.
  const loops = practiceFor(["loops"], CONTENT, (id) => solved.has(id)).loops;
  assert.ok(loops.some((i) => i.kind === "format" && i.title.startsWith("Trace table on #4")));
});

test("recommended bounties follow the focus areas and skip locked or solved ones", () => {
  const profile = buildProfile({ tickets: struggler(), warmupLog: strugglerWarmups, content: CONTENT, today: TODAY });
  assert.deepEqual(recommendedBounties(profile, CONTENT, (id) => ["t6"].includes(id)), ["b5"]);
  assert.deepEqual(recommendedBounties(profile, CONTENT, (id) => ["t6", "b5"].includes(id)), []);
  assert.deepEqual(recommendedBounties(profile, CONTENT, () => false), []);
});
