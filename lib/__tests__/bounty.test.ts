import assert from "node:assert/strict";
import { test } from "node:test";
import { bountyProgress, bountyState, lessonHref, revealText, withArticle } from "../game/bounty.ts";
import {
  finalSeasonIndex,
  isSideQuest,
  mainSeasons,
  nextStoryTicketId,
  previousTicketId,
  seasonGate,
  seasonOpen,
  type OrderSeason,
} from "../content/order.ts";

// The real shape: two on-chain floors, the Bug Bounty side quest (s50) and the final exam (s99).
const SEASONS: OrderSeason[] = [
  { id: "s01", tickets: [{ id: "s01-t01" }, { id: "s01-t02" }] },
  { id: "s02", tickets: [{ id: "s02-t01" }] },
  {
    id: "s50",
    chain: false,
    tickets: [
      { id: "s50-t01", requires: "s01-t02" },
      { id: "s50-t02", requires: "s02-t01" },
      { id: "s50-t03", requires: null },
    ],
  },
  { id: "s99", chain: false, final: true, tickets: [{ id: "s99-t01" }, { id: "s99-t02" }] },
];

test("a side quest is off-chain and not the final", () => {
  assert.deepEqual(SEASONS.map(isSideQuest), [false, false, true, false]);
  assert.deepEqual(mainSeasons(SEASONS).map((s) => s.id), ["s01", "s02", "s99"]);
});

test("the final exam stays gated on the last ON-CHAIN season, not on the bounty board", () => {
  const index = finalSeasonIndex(SEASONS);
  assert.equal(index, 3);
  assert.deepEqual(seasonGate(SEASONS, index), ["s02-t01"]);
  const solved = new Set(["s01-t01", "s01-t02", "s02-t01"]); // no bounty solved at all
  assert.equal(seasonOpen(SEASONS, index, (id) => solved.has(id)), true);
  assert.equal(previousTicketId(SEASONS, "s99-t01"), "s02-t01");
});

test("the bounty board is never gated as a whole; each ticket opens on its own `requires`", () => {
  assert.deepEqual(seasonGate(SEASONS, 2), []);
  assert.equal(seasonOpen(SEASONS, 2, () => false), true);
  assert.equal(previousTicketId(SEASONS, "s50-t01"), "s01-t02");
  assert.equal(previousTicketId(SEASONS, "s50-t02"), "s02-t01"); // not the previous bounty
  assert.equal(previousTicketId(SEASONS, "s50-t03"), null);
});

test("'Next ticket' follows the story and skips the bounty board", () => {
  assert.equal(nextStoryTicketId(SEASONS, "s01-t02"), "s02-t01");
  assert.equal(nextStoryTicketId(SEASONS, "s02-t01"), "s99-t01");
  assert.equal(nextStoryTicketId(SEASONS, "s99-t02"), null);
  assert.equal(nextStoryTicketId(SEASONS, "s50-t01"), null);
});

test("bounty card states", () => {
  const solved = new Set(["s01-t02", "s50-t03"]);
  const isSolved = (id: string) => solved.has(id);
  assert.equal(bountyState({ id: "s50-t01", requires: { id: "s01-t02" } }, isSolved), "open");
  assert.equal(bountyState({ id: "s50-t02", requires: { id: "s02-t01" } }, isSolved), "locked");
  assert.equal(bountyState({ id: "s50-t03", requires: null }, isSolved), "done");
  assert.equal(bountyState({ id: "s50-t04", requires: null }, isSolved), "open");
  assert.deepEqual(bountyProgress(["open", "locked", "done", "open"]), { solved: 1, open: 2, total: 4 });
});

test("the reveal names the kind of bug and links to the lesson", () => {
  assert.equal(withArticle("off-by-one"), "an off-by-one");
  assert.equal(withArticle("None"), "a None");
  assert.equal(withArticle("mutable default"), "a mutable default");
  assert.equal(revealText("off-by-one"), "This was an off-by-one bug.");
  assert.equal(lessonHref("s01-t04"), "/ticket/s01-t04/#lesson");
});
