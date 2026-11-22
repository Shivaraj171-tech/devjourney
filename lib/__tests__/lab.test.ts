// The Robotics Lab: the side-floor unlock rules (lib/content/order.ts) and the
// viz-trace parsing and limits (lib/lab/viz.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  finalSeasonIndex,
  isBountyBoard,
  isSideFloor,
  isSideQuest,
  mainSeasons,
  nextStoryTicketId,
  previousTicketId,
  seasonGate,
  seasonOpen,
  type OrderSeason,
} from "../content/order.ts";
import {
  armBounds,
  armFrameSummary,
  chartSummary,
  gridSummary,
  gripper,
  jointPositions,
  niceTicks,
  parseViz,
  pointsSummary,
  reachableSamples,
  reachRing,
  VIZ_LIMITS,
  type ArmItem,
  type ChartItem,
  type GridItem,
  type PointsItem,
} from "../lab/viz.ts";

// The real shape: on-chain floors, the Robotics Lab side floor (s40), the bounty board (s50), the final (s99).
const SEASONS: OrderSeason[] = [
  { id: "s01", tickets: [{ id: "s01-t01" }, { id: "s01-t10" }] },
  { id: "s05", tickets: [{ id: "s05-t01" }, { id: "s05-t06" }] },
  { id: "s40", chain: false, requires: "s01-t10", tickets: [{ id: "s40-t01" }, { id: "s40-t02" }, { id: "s40-t03" }] },
  { id: "s50", chain: false, tickets: [{ id: "s50-t01", requires: "s01-t01" }] },
  { id: "s99", chain: false, final: true, tickets: [{ id: "s99-t01" }] },
];

test("a side floor is a side quest with a season-level `requires`; the bounty board isn't", () => {
  assert.deepEqual(SEASONS.map(isSideFloor), [false, false, true, false, false]);
  assert.deepEqual(SEASONS.map(isBountyBoard), [false, false, false, true, false]);
  assert.deepEqual(SEASONS.map(isSideQuest), [false, false, true, true, false]);
  assert.deepEqual(mainSeasons(SEASONS).map((s) => s.id), ["s01", "s05", "s99"]);
});

test("the whole lab opens once its `requires` is solved, then its tickets open in order", () => {
  assert.deepEqual(seasonGate(SEASONS, 2), ["s01-t10"]);
  assert.equal(seasonOpen(SEASONS, 2, () => false), false);
  assert.equal(seasonOpen(SEASONS, 2, (id) => id === "s01-t10"), true);
  assert.equal(previousTicketId(SEASONS, "s40-t01"), "s01-t10");
  assert.equal(previousTicketId(SEASONS, "s40-t02"), "s40-t01");
  assert.equal(previousTicketId(SEASONS, "s40-t03"), "s40-t02");
});

test("the lab never blocks anything: the final exam stays gated on the last on-chain season", () => {
  const index = finalSeasonIndex(SEASONS);
  assert.deepEqual(seasonGate(SEASONS, index), ["s05-t01", "s05-t06"]);
  const solved = new Set(["s01-t01", "s01-t10", "s05-t01", "s05-t06"]); // no lab ticket solved
  assert.equal(seasonOpen(SEASONS, index, (id) => solved.has(id)), true);
  assert.equal(previousTicketId(SEASONS, "s99-t01"), "s05-t06");
  // The bounty board's own gating is unchanged.
  assert.equal(previousTicketId(SEASONS, "s50-t01"), "s01-t01");
  assert.deepEqual(seasonGate(SEASONS, 3), []);
});

test("'Next ticket' stays inside the lab; the story skips it", () => {
  assert.equal(nextStoryTicketId(SEASONS, "s40-t01"), "s40-t02");
  assert.equal(nextStoryTicketId(SEASONS, "s40-t03"), null);
  assert.equal(nextStoryTicketId(SEASONS, "s01-t10"), "s05-t01");
  assert.equal(nextStoryTicketId(SEASONS, "s05-t06"), "s99-t01");
});

// ---------- viz parsing ----------

const ARM = { kind: "arm", name: "arm", title: "Reach", lengths: [1, 0.8], frames: [[0, 0], [Math.PI / 2, 0]], target: [0, 1.8], caption: "", truncated: false };

test("parseViz keeps well-formed items of every kind", () => {
  const items = parseViz([
    ARM,
    { kind: "chart", name: "loss", title: "Loss", x_label: "step", y_label: "", hline: 0.01, log: true, series: [{ label: "train", xs: [0, 1, 2], ys: [1, 0.5, 0.1] }], truncated: false },
    { kind: "grid", name: "q", title: "Q", values: [[0, 1], [null, 2]], path: [[0, 0], [0, 1]], start: [0, 0], goal: [1, 1], arrows: [["→", "↓"], ["", ""]] },
    { kind: "points", name: "g", title: "Grasps", points: [[1, 2], [3, 4]], labels: [0, 1], classes: ["fail", "success"] },
  ]);
  assert.deepEqual(items.map((i) => i.kind), ["arm", "chart", "grid", "points"]);
  const arm = items[0] as ArmItem;
  assert.deepEqual(arm.frames, ARM.frames);
  assert.equal(arm.trail, true); // on unless turned off
  assert.equal((parseViz([{ ...ARM, trail: false }])[0] as ArmItem).trail, false);
  assert.deepEqual(arm.target, [0, 1.8]);
  const chart = items[1] as ChartItem;
  assert.equal(chart.log, true);
  assert.equal(chart.hline, 0.01);
  assert.equal(chart.xLabel, "step");
  const grid = items[2] as GridItem;
  assert.deepEqual(grid.values[1], [null, 2]);
  assert.deepEqual(grid.goal, [1, 1]);
  assert.deepEqual((items[3] as PointsItem).labels, [0, 1]);
});

test("parseViz drops junk instead of throwing", () => {
  assert.deepEqual(parseViz(null), []);
  assert.deepEqual(parseViz("arm"), []);
  assert.deepEqual(parseViz({ kind: "arm" }), []);
  const items = parseViz([
    42,
    { kind: "video" },
    { ...ARM, lengths: [] },
    { ...ARM, lengths: [1, -1] },
    { ...ARM, frames: [[0]] }, // wrong number of joints
    { ...ARM, frames: [[0, "x"]] },
    { kind: "chart", series: [] },
    { kind: "chart", series: [{ xs: "nope", ys: [] }] },
    { kind: "grid", values: [] },
    { kind: "points", points: [["a", 1]] },
  ]);
  assert.deepEqual(items, []);
});

test("parseViz re-applies the limits (items, frames, points, text)", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ ...ARM, name: `arm${i}` }));
  assert.equal(parseViz(many).length, VIZ_LIMITS.items);
  const long = { ...ARM, title: "x".repeat(500), frames: Array.from({ length: 1000 }, () => [0, 0]) };
  const arm = parseViz([long])[0] as ArmItem;
  assert.equal(arm.frames.length, VIZ_LIMITS.frames);
  assert.equal(arm.title.length, VIZ_LIMITS.text);
  const xs = Array.from({ length: 2000 }, (_, i) => i);
  const chart = parseViz([{ kind: "chart", series: Array.from({ length: 10 }, () => ({ label: "l", xs, ys: xs })) }])[0] as ChartItem;
  assert.equal(chart.series.length, VIZ_LIMITS.series);
  assert.equal(chart.series[0].xs.length, VIZ_LIMITS.points);
});

test("an exploded loss (null) is kept as a gap; a point without x is dropped", () => {
  const chart = parseViz([{ kind: "chart", title: "Loss", series: [{ label: "train", xs: [0, 1, null, 3], ys: [1, null, 5, 2] }] }])[0] as ChartItem;
  assert.deepEqual(chart.series[0].xs, [0, 1, 3]);
  assert.deepEqual(chart.series[0].ys, [1, null, 2]);
  assert.match(chartSummary(chart), /train rises from 1 to 2 \(1 values not finite/);
  const flat = parseViz([{ kind: "chart", title: "Turn", series: [{ label: "turn", xs: [0, 1], ys: [12, 12] }] }])[0] as ChartItem;
  assert.equal(chartSummary(flat), "Turn: turn stays at 12.");
  const dead = parseViz([{ kind: "chart", title: "Loss", series: [{ label: "train", xs: [0, 1], ys: [null, null] }] }])[0] as ChartItem;
  assert.match(chartSummary(dead), /no finite values/);
});

test("per-frame targets and ghosts, marks and limits survive parsing; bad limits are dropped", () => {
  const [arm] = parseViz([
    { ...ARM, targets: [[1, 1], null], ghost: [[0.5, 0.5], [0, 1]], marks: [{ x: 1, y: 0, label: "ok", ok: true }, { x: "?", y: 0 }], limits: [[-1, 1], [0, 2]] },
  ]) as ArmItem[];
  assert.deepEqual(arm.targets, [[1, 1], null]);
  assert.deepEqual(arm.ghost, [[0.5, 0.5], [0, 1]]);
  assert.deepEqual(arm.marks, [{ x: 1, y: 0, label: "ok", ok: true }]);
  assert.deepEqual(arm.limits, [[-1, 1], [0, 2]]);
  const [noLimits] = parseViz([{ ...ARM, limits: [[1, -1], [0, 2]] }]) as ArmItem[];
  assert.equal(noLimits.limits, undefined);
});

// ---------- geometry and summaries ----------

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test("forward kinematics of the viewer: relative angles add up", () => {
  const [x, y] = gripper([1, 0.8], [Math.PI / 2, -Math.PI / 2]);
  close(x, 0.8);
  close(y, 1);
  const pts = jointPositions([1, 1, 1], [0, Math.PI / 2, Math.PI / 2]);
  assert.equal(pts.length, 4);
  close(pts[3][0], 0);
  close(pts[3][1], 1);
});

test("the reachable ring and sampled workspace", () => {
  assert.deepEqual(reachRing([1, 0.8]), { inner: 0.19999999999999996, outer: 1.8 });
  assert.deepEqual(reachRing([0.5, 2]), { inner: 1.5, outer: 2.5 });
  const samples = reachableSamples([1, 0.8], [[0, Math.PI / 2], [0, 0]], 10);
  assert.equal(samples.length, 100); // 10 shoulder x 10 elbow values (the elbow range is a single angle here)
  for (const [x, y] of samples) close(Math.hypot(x, y), 1.8);
  // Many links: the total stays small.
  assert.ok(reachableSamples([1, 1, 1, 1, 1, 1], Array.from({ length: 6 }, () => [0, 1] as [number, number])).length <= 4096);
});

test("summaries say where the arm is and how far from the target", () => {
  const arm = parseViz([{ ...ARM, ghost: [null, [0.1, 1.7]] }])[0] as ArmItem;
  assert.equal(armFrameSummary(arm, 0), "Frame 1 of 2 · joints 0°, 0° · gripper at (1.80, 0.00) · target (0.00, 1.80), 2.546 away");
  assert.equal(armFrameSummary(arm, 99), "Frame 2 of 2 · joints 90°, 0° · gripper at (0.00, 1.80) · target (0.00, 1.80), 0.000 away · your code says (0.10, 1.70)");
  const b = armBounds(arm);
  close(b.max, 1.98);
  const grid = parseViz([{ kind: "grid", title: "Policy", values: [[0, 0], [0, 0]], path: [[0, 0], [1, 1]], goal: [1, 1] }])[0] as GridItem;
  assert.equal(gridSummary(grid), "Policy: 2 × 2 grid, path of 2 cells reaches the goal.");
  const pts = parseViz([{ kind: "points", title: "Grasps", points: [[0, 0], [1, 1], [2, 2]], labels: [1, 0, 1], classes: ["fail", "success"] }])[0] as PointsItem;
  assert.equal(pointsSummary(pts), "Grasps: 3 points, 2 success and 1 fail.");
});

test("nice axis ticks", () => {
  assert.deepEqual(niceTicks(0, 1, 4), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(niceTicks(0, 100, 4), [0, 25, 50, 75, 100]);
  assert.deepEqual(niceTicks(5, 5), [5]);
});
