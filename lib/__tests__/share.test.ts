import assert from "node:assert/strict";
import { test } from "node:test";
import { conceptLabel } from "../content/concepts.ts";
import { hitlShareText, ticketsAwayText, ticketsForXp } from "../game/share.ts";

test("concept slugs become human-friendly names", () => {
  assert.equal(conceptLabel("mutable-shared-data"), "Mutable shared data");
  assert.equal(conceptLabel("reading-code"), "Reading code");
  assert.equal(conceptLabel("json"), "JSON");
  assert.equal(conceptLabel("brand-new-idea"), "Brand new idea");
  assert.equal(conceptLabel("None (no value)"), "None (no value)");
});

test("XP gaps are converted to a realistic number of tickets", () => {
  assert.equal(ticketsForXp(1), 1);
  assert.equal(ticketsForXp(150), 1);
  assert.equal(ticketsForXp(1001), 8);
  assert.equal(ticketsAwayText(90), "That's about one ticket.");
  assert.equal(ticketsAwayText(1001), "That's about 8 tickets.");
  assert.match(ticketsAwayText(15000), /Keep shipping/);
});

test("share text names the score and the site", () => {
  const text = hitlShareText(7, 9, "https://example.com/devjourney/");
  assert.match(text, /^I caught 7 of 9 of Byte's AI bugs on DevJourney/);
  assert.ok(text.endsWith("https://example.com/devjourney/"));
});
