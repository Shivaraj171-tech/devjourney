import assert from "node:assert/strict";
import { test } from "node:test";
import { loadingView } from "../runner/loadProgress.ts";

test("loadingView: stages move forward and the percentage never goes back", () => {
  const seq = [
    loadingView(null),
    loadingView({ stage: "waiting" }),
    loadingView({ stage: "download", filesDone: 0, filesTotal: 4 }),
    loadingView({ stage: "download", filesDone: 2, filesTotal: 4 }),
    loadingView({ stage: "download", filesDone: 4, filesTotal: 4 }),
    loadingView({ stage: "checker" }),
  ];
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i].percent >= seq[i - 1].percent, `step ${i}`);
  assert.ok(seq.every((v) => v.percent > 0 && v.percent < 100));
});

test("loadingView: says what is happening in plain words", () => {
  assert.match(loadingView({ stage: "download", filesDone: 1, filesTotal: 4 }).label, /Downloading Python \(1 of 4 files\)/);
  assert.match(loadingView({ stage: "download", filesDone: 4, filesTotal: 4 }).label, /Starting Python/);
  assert.match(loadingView({ stage: "checker" }).label, /Loading the checks/);
  // Never more files done than exist.
  assert.match(loadingView({ stage: "download", filesDone: 9, filesTotal: 4 }).label, /Starting Python/);
});
