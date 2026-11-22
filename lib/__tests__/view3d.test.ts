// The 3D Lab viewer: parsing `viz.frames3d` items (lib/lab/viz.ts) and the
// camera / projection / summary maths (lib/lab/view3d.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseViz, VIZ_LIMITS, type Frames3DItem } from "../lab/viz.ts";
import {
  angleBetween,
  axisOf,
  cameraBasis,
  defaultCamera,
  dot3,
  floorGrid,
  frames3dSummary,
  frameShapes,
  norm3,
  orbit,
  originOf,
  PITCH_LIMIT,
  project,
  sceneBounds,
  shapeDepth,
  viewSummary,
  zoom,
  type Camera,
} from "../lab/view3d.ts";

const I34 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
/** A pose turned by `a` about z, at (x, y, z): its top three rows. */
const rz = (a: number, x = 0, y = 0, z = 0) => [Math.cos(a), -Math.sin(a), 0, x, Math.sin(a), Math.cos(a), 0, y, 0, 0, 1, z];

const raw = (over: Record<string, unknown> = {}) => ({
  kind: "frames3d",
  name: "box",
  title: "Turning the box",
  caption: "c",
  style: "frames",
  frames: [
    [I34, rz(0, 0.5)],
    [I34, rz(Math.PI / 2, 0.5)],
  ],
  axes: [true, true],
  labels: ["world", "box"],
  links: [[0, 1]],
  points: [{ x: 1, y: 0, z: 0, label: "bin" }],
  lines: [[[0, 0, 0], [0, 0, 1]]],
  target: { pose: rz(Math.PI / 2, 0.5) },
  trail: 1,
  scale: null,
  bad_bottom: false,
  truncated: false,
  ...over,
});

function item(over: Record<string, unknown> = {}): Frames3DItem {
  const [parsed] = parseViz([raw(over)]);
  assert.equal(parsed?.kind, "frames3d");
  return parsed as Frames3DItem;
}

test("parseViz: a frames3d item is cleaned and kept", () => {
  const it = item();
  assert.equal(it.frames.length, 2);
  assert.deepEqual(it.labels, ["world", "box"]);
  assert.deepEqual(it.links, [[0, 1]]);
  assert.deepEqual(it.lines, [[[0, 0, 0], [0, 0, 1]]]);
  assert.equal(it.trail, 1);
  assert.equal(it.style, "frames");
  assert.ok(it.target && "pose" in it.target);
  assert.equal(it.badBottom, false);
});

test("parseViz: broken 3D input is dropped piece by piece, never thrown", () => {
  // A bad matrix becomes null (its slot is kept so labels still line up); bad links, points and trail go.
  const it = item({
    frames: [[I34, [1, 2, 3]], [I34, rz(1)]],
    links: [[0, 5], [0, 1], "x"],
    points: [{ x: 1, y: "no", z: 0 }, { x: 0, y: 0, z: 0 }],
    trail: 9,
    target: { pose: [1, 2] },
    style: "weird",
    bad_bottom: true,
  });
  assert.equal(it.frames[0][1], null);
  assert.deepEqual(it.links, [[0, 1]]);
  assert.equal(it.points.length, 1);
  assert.equal(it.trail, null);
  assert.equal(it.target, null);
  assert.equal(it.style, "frames");
  assert.equal(it.badBottom, true);
  // Nothing drawable at all: the item is dropped.
  assert.deepEqual(parseViz([raw({ frames: [[[1]], [null]] })]), []);
  assert.deepEqual(parseViz([raw({ frames: "no" })]), []);
});

test("parseViz: 3D limits (transforms per frame, frames per item)", () => {
  const scene = Array.from({ length: 20 }, () => I34);
  const it = item({ frames: Array.from({ length: 500 }, () => scene) });
  assert.equal(it.frames.length, VIZ_LIMITS.frames);
  assert.equal(it.frames[0].length, VIZ_LIMITS.transforms);
});

test("origin and axes are read from the matrix columns", () => {
  const m = rz(Math.PI / 2, 1, 2, 3);
  assert.deepEqual(originOf(m), [1, 2, 3]);
  const x = axisOf(m, 0);
  assert.ok(Math.abs(x[0]) < 1e-12 && Math.abs(x[1] - 1) < 1e-12, "a quarter turn about z sends x to y");
});

const cam = (over: Partial<Camera> = {}): Camera => ({ yaw: 0, pitch: 0, dist: 5, target: [0, 0, 0], fov: Math.PI / 2, ...over });

test("camera basis is orthonormal and looks at the target", () => {
  const c = cam({ yaw: 0.7, pitch: 0.4 });
  const { eye, right, up, forward } = cameraBasis(c);
  for (const v of [right, up, forward]) assert.ok(Math.abs(norm3(v) - 1) < 1e-12);
  assert.ok(Math.abs(dot3(right, up)) < 1e-12 && Math.abs(dot3(right, forward)) < 1e-12 && Math.abs(dot3(up, forward)) < 1e-12);
  assert.ok(Math.abs(norm3(eye) - 5) < 1e-12);
  assert.ok(up[2] > 0, "the camera's up has a positive world z (z is up)");
});

test("perspective projection: centre, sides, depth, behind the camera", () => {
  // Camera on +x, looking at the origin.
  const c = cam();
  const centre = project([0, 0, 0], c, 200, 100)!;
  assert.deepEqual([Math.round(centre.x), Math.round(centre.y)], [100, 50]);
  assert.equal(centre.depth, 5);
  // fov 90°: focal = (100 / 2) / tan(45°) = 50 px; a point 1 unit up at depth 5 is 10 px above centre.
  const up = project([0, 0, 1], c, 200, 100)!;
  assert.ok(Math.abs(up.y - 40) < 1e-9 && Math.abs(up.x - 100) < 1e-9);
  // Looking from +x towards -x with z up, world +y is on the screen's right.
  const side = project([0, 1, 0], c, 200, 100)!;
  assert.ok(side.x > 100);
  // Further away: smaller.
  const near = project([2, 0, 1], c, 200, 100)!;
  assert.ok(50 - near.y > 50 - up.y);
  assert.equal(project([10, 0, 0], c, 200, 100), null, "behind the camera");
});

test("orbit wraps yaw and clamps pitch; zoom stays within the scene's range", () => {
  const c = orbit(cam(), -0.5, 10);
  assert.ok(c.yaw > 0 && c.yaw < 2 * Math.PI);
  assert.equal(c.pitch, PITCH_LIMIT);
  assert.equal(orbit(cam(), 0, -10).pitch, -PITCH_LIMIT);
  assert.equal(zoom(cam({ dist: 5 }), 100, 1).dist, 0.8);
  assert.equal(zoom(cam({ dist: 5 }), 0.001, 1).dist, 12);
  assert.equal(zoom(cam({ dist: 5 }), 2, 1).dist, 2.5);
  assert.equal(viewSummary(cam({ yaw: Math.PI / 2, pitch: Math.PI / 6 })), "View from 90° around, 30° up");
});

test("scene bounds include every frame, the target, points and lines; the default camera frames them", () => {
  const it = item();
  const { center, radius } = sceneBounds(it);
  assert.ok(radius >= 0.5);
  for (const p of [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0.5, 0, 0]] as [number, number, number][])
    assert.ok(Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2]) <= radius);
  const c = defaultCamera(it);
  assert.equal(c.dist, radius * 3.4);
  assert.deepEqual(c.target, center);
  const grid = floorGrid(center, radius);
  assert.ok(grid.lines.length >= 6 && grid.lines.every(([a, b]) => a[2] === 0 && b[2] === 0));
});

test("frame shapes: a labelled triad per transform, links, trail, target, points", () => {
  const it = item();
  const shapes = frameShapes(it, 1, 0.3);
  const labels = shapes.filter((s) => s.kind === "label").map((s) => (s.kind === "label" ? s.text : ""));
  // Every triad tip is labelled x / y / z (colour is never the only cue).
  assert.equal(labels.filter((l) => l === "x").length, 2);
  assert.equal(labels.filter((l) => l === "z").length, 2);
  assert.ok(labels.includes("world") && labels.includes("box") && labels.includes("bin") && labels.includes("target"));
  const roles = shapes.filter((s) => s.kind === "segment").map((s) => s.role);
  assert.ok(roles.includes("link") && roles.includes("trail") && roles.includes("line") && roles.includes("target-x"));
  // The box's x axis tip at frame 1 (turned 90°) points along world +y.
  const xs = shapes.filter((s) => s.kind === "segment" && s.role === "x");
  const tip = xs[1].kind === "segment" ? xs[1].b : [0, 0, 0];
  assert.ok(Math.abs(tip[0] - 0.5) < 1e-9 && Math.abs(tip[1] - 0.3) < 1e-9);
  // Depths sort shapes back to front.
  const d = shapeDepth(xs[0], defaultCamera(it), 300, 200);
  assert.ok(d !== null && d > 0);
  // Arm style: links are the arm.
  assert.ok(frameShapes(item({ style: "arm" }), 0, 0.3).some((s) => s.kind === "segment" && s.role === "arm"));
});

test("text summary: where the focus frame is, its axes, the target, stretched axes", () => {
  const it = item();
  assert.equal(
    frames3dSummary(it, 1),
    "Frame 2 of 2 · world at (0.00, 0.00, 0.00) · box at (0.50, 0.00, 0.00), its x axis points (0.00, 1.00, 0.00), y (-1.00, 0.00, 0.00), z (0.00, 0.00, 1.00) · target (0.50, 0.00, 0.00), 0.000 away · turned 0° from the target's orientation",
  );
  assert.match(frames3dSummary(it, 0), /^Frame 1 of 2 .* turned 90° from the target's orientation$/);
  const stretched = item({ frames: [[I34, [1.1, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 1.1, 0]]], target: null, trail: null });
  assert.match(frames3dSummary(stretched, 0), /axis lengths 1\.10, 1\.10, 1\.10 \(not a pure rotation\)/);
  assert.ok(Math.abs(angleBetween(I34, rz(0.5)) - 0.5) < 1e-9);
});
