// The maths behind the 3D Lab viewer (components/Frames3DView.tsx): a tiny orbit
// camera with perspective projection, the scene's bounds, the list of things to
// draw (sorted back to front), and the plain-text summary of a frame.
// World coordinates are z-up and right-handed, like the robotics lessons.
// Pure functions, no DOM, so node can unit-test them.
import { short, type Arrow3, type Ellipsoid3, type Frames3DItem, type Mat34, type Vec3 } from "./viz.ts";

/** An orbit camera: it looks at `target` from `dist` away, at a compass angle and a height angle. */
export type Camera = {
  /** Compass angle of the camera around the z axis, radians (0: looking from +x towards -x). */
  yaw: number;
  /** Height angle above the floor, radians (clamped to ±PITCH_LIMIT). */
  pitch: number;
  dist: number;
  target: Vec3;
  /** Vertical field of view, radians. */
  fov: number;
};

export const PITCH_LIMIT = (85 * Math.PI) / 180;
export const DEFAULT_YAW = (35 * Math.PI) / 180;
export const DEFAULT_PITCH = (25 * Math.PI) / 180;
/** Keyboard steps: arrows turn the view by these. */
export const YAW_STEP = (15 * Math.PI) / 180;
export const PITCH_STEP = (10 * Math.PI) / 180;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export function normalize3(a: Vec3): Vec3 {
  const n = norm3(a);
  return n > 1e-12 ? scale3(a, 1 / n) : [0, 0, 0];
}

/** A transform's origin (its translation column). */
export const originOf = (m: Mat34): Vec3 => [m[3], m[7], m[11]];
/** A transform's k-th axis (column k of its rotation part: where its x / y / z axis points). */
export const axisOf = (m: Mat34, k: 0 | 1 | 2): Vec3 => [m[k], m[4 + k], m[8 + k]];

/** Where the camera sits, and its right / up / forward unit vectors. */
export function cameraBasis(cam: Camera): { eye: Vec3; right: Vec3; up: Vec3; forward: Vec3 } {
  const cp = Math.cos(cam.pitch);
  const offset: Vec3 = [cp * Math.cos(cam.yaw), cp * Math.sin(cam.yaw), Math.sin(cam.pitch)];
  const eye = add(cam.target, scale3(offset, cam.dist));
  const forward = scale3(offset, -1);
  // Pitch is clamped below 90°, so forward is never parallel to the world's up (z).
  const right = normalize3(cross(forward, [0, 0, 1]));
  const up = cross(right, forward);
  return { eye, right, up, forward };
}

export type Projected = { x: number; y: number; depth: number };
const NEAR = 1e-3;

/**
 * Perspective projection of a world point onto a `width` × `height` canvas (y down).
 * depth is the distance along the view direction (bigger: further away); null if the
 * point is behind the camera.
 */
export function project(p: Vec3, cam: Camera, width: number, height: number): Projected | null {
  const { eye, right, up, forward } = cameraBasis(cam);
  const d = sub(p, eye);
  const depth = dot3(d, forward);
  if (depth <= NEAR) return null;
  const focal = height / 2 / Math.tan(cam.fov / 2);
  return { x: width / 2 + (focal * dot3(d, right)) / depth, y: height / 2 - (focal * dot3(d, up)) / depth, depth };
}

/** Turn the camera: yaw wraps around, pitch stays within ±PITCH_LIMIT. */
export function orbit(cam: Camera, dYaw: number, dPitch: number): Camera {
  const tau = 2 * Math.PI;
  const yaw = (((cam.yaw + dYaw) % tau) + tau) % tau;
  const pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, cam.pitch + dPitch));
  return { ...cam, yaw, pitch };
}

/** Zoom by a factor (> 1: closer), within sensible distances for the scene's radius. */
export function zoom(cam: Camera, factor: number, radius: number): Camera {
  const dist = Math.max(radius * 0.8, Math.min(radius * 12, cam.dist / factor));
  return { ...cam, dist };
}

/** The centre and radius of everything the item ever shows (all frames, target, points, lines). */
export function sceneBounds(item: Frames3DItem): { center: Vec3; radius: number } {
  const pts: Vec3[] = [[0, 0, 0]];
  for (const scene of item.frames) for (const m of scene) if (m) pts.push(originOf(m));
  for (const p of item.points) pts.push([p.x, p.y, p.z]);
  for (const [a, b] of item.lines) pts.push(a, b);
  if (item.target) pts.push("pose" in item.target ? originOf(item.target.pose) : item.target.point);
  for (const scene of item.ellipsoids)
    for (const e of scene) e.axes.forEach((a, k) => pts.push(add(e.center, scale3(a, e.radii[k])), sub(e.center, scale3(a, e.radii[k]))));
  for (const scene of item.arrows) for (const a of scene) pts.push(a.start, add(a.start, a.vec));
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of pts)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[k]);
      hi[k] = Math.max(hi[k], p[k]);
    }
  const center = scale3(add(lo, hi), 0.5);
  const radius = Math.max(0.5, ...pts.map((p) => norm3(sub(p, center)))) * 1.15;
  return { center, radius };
}

/** Triad length: the item's own, or a fraction of the scene's radius. */
export function triadLength(item: Frames3DItem, radius: number): number {
  return item.scale ?? Math.max(0.12, Math.min(0.5, radius * 0.28));
}

/** A camera that frames the whole scene from the default angle. */
export function defaultCamera(item: Frames3DItem): Camera {
  const { center, radius } = sceneBounds(item);
  return { yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH, dist: radius * 3.4, target: center, fov: (30 * Math.PI) / 180 };
}

/** Grid lines on the floor (z = 0): a square around the scene, `step` apart. */
export function floorGrid(center: Vec3, radius: number): { step: number; lines: [Vec3, Vec3][] } {
  const raw = radius / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const half = Math.ceil((radius * 1.2) / step) * step;
  const cx = Math.round(center[0] / step) * step;
  const cy = Math.round(center[1] / step) * step;
  const lines: [Vec3, Vec3][] = [];
  for (let v = -half; v <= half + 1e-9; v += step) {
    lines.push([[cx + v, cy - half, 0], [cx + v, cy + half, 0]]);
    lines.push([[cx - half, cy + v, 0], [cx + half, cy + v, 0]]);
  }
  return { step, lines };
}

/** What to draw for one frame, in world space. The viewer projects, sorts and paints them. */
export type Shape =
  | {
      kind: "segment";
      a: Vec3;
      b: Vec3;
      role: "x" | "y" | "z" | "link" | "arm" | "trail" | "line" | "target-x" | "target-y" | "target-z" | "ellipsoid" | "ellipsoid-axis";
    }
  | { kind: "arrow"; a: Vec3; b: Vec3; role: "arrow" }
  | { kind: "label"; at: Vec3; text: string; role: "x" | "y" | "z" | "name" | "point" | "target" | "ellipsoid" | "arrow" }
  | { kind: "dot"; at: Vec3; role: "joint" | "point" | "target" | "origin" };

export const AXIS_NAMES = ["x", "y", "z"] as const;

/** The ellipsoids / arrows of frame `i` (clamped; a list shorter than the frames repeats its last entry). */
export function ellipsoidsAt(item: Frames3DItem, i: number): Ellipsoid3[] {
  const n = item.ellipsoids.length;
  return n ? item.ellipsoids[Math.max(0, Math.min(i, n - 1))] : [];
}
export function arrowsAt(item: Frames3DItem, i: number): Arrow3[] {
  const n = item.arrows.length;
  return n ? item.arrows[Math.max(0, Math.min(i, n - 1))] : [];
}

/** The point of the ellipsoid in the unit-sphere direction `u` (u[k]: along axis k): center + Σ u_k r_k a_k. */
export function ellipsoidPoint(e: Ellipsoid3, u: number[]): Vec3 {
  let p = e.center;
  e.axes.forEach((a, k) => {
    p = add(p, scale3(a, e.radii[k] * (u[k] ?? 0)));
  });
  return p;
}

/** Latitudes (degrees) and longitudes of the wireframe. */
export const ELLIPSOID_LATITUDES = [-60, -30, 0, 30, 60];
export const ELLIPSOID_LONGITUDES = [0, 45, 90, 135];

/**
 * The wireframe of an ellipsoid as closed polylines (`steps` points each, the first not
 * repeated): latitude rings about its third axis and longitude rings through its poles.
 * A flat ellipse (2 axes) is one ring. A zero radius flattens the rings: that is the point.
 */
export function ellipsoidRings(e: Ellipsoid3, steps = 36): Vec3[][] {
  const ring = (f: (t: number) => number[]) => Array.from({ length: steps }, (_, s) => ellipsoidPoint(e, f((2 * Math.PI * s) / steps)));
  if (e.axes.length === 2) return [ring((t) => [Math.cos(t), Math.sin(t)])];
  const rad = Math.PI / 180;
  const out: Vec3[][] = [];
  for (const lat of ELLIPSOID_LATITUDES) {
    const c = Math.cos(lat * rad);
    const s = Math.sin(lat * rad);
    out.push(ring((t) => [c * Math.cos(t), c * Math.sin(t), s]));
  }
  for (const lon of ELLIPSOID_LONGITUDES) {
    const c = Math.cos(lon * rad);
    const s = Math.sin(lon * rad);
    out.push(ring((t) => [c * Math.cos(t), s * Math.cos(t), Math.sin(t)]));
  }
  return out;
}

/** Condition number of an ellipsoid: largest radius / smallest (Infinity when flat). */
export function ellipsoidCondition(e: Ellipsoid3): number {
  const big = Math.max(...e.radii);
  const small = Math.min(...e.radii);
  if (big === 0) return Infinity;
  return small <= big * 1e-9 ? Infinity : big / small;
}

/** "velocity: radii 0.52, 0.31, 0.020 · condition number 26" (flat: "∞, singular"). */
export function ellipsoidSummary(e: Ellipsoid3): string {
  const k = ellipsoidCondition(e);
  const cond = Number.isFinite(k) ? `condition number ${short(k)}` : "condition number ∞ (flat: singular)";
  return `${e.label || (e.axes.length === 2 ? "ellipse" : "ellipsoid")}: radii ${e.radii.map(short).join(", ")} · ${cond}`;
}

/** "v: (0.10, 0.00, -0.20), length 0.224". */
export function arrowSummary(a: Arrow3): string {
  return `${a.label || "arrow"} ${fmtVec(a.vec)}, length ${short(norm3(a.vec))}`;
}

/** Every shape of frame `i` (clamped), in world space. */
export function frameShapes(item: Frames3DItem, i: number, triad: number): Shape[] {
  const f = Math.max(0, Math.min(i, item.frames.length - 1));
  const scene = item.frames[f];
  const out: Shape[] = [];
  for (const [a, b] of item.lines) out.push({ kind: "segment", a, b, role: "line" });
  for (const p of item.points) {
    out.push({ kind: "dot", at: [p.x, p.y, p.z], role: "point" });
    if (p.label) out.push({ kind: "label", at: [p.x, p.y, p.z], text: p.label, role: "point" });
  }
  if (item.target) {
    if ("pose" in item.target) {
      const m = item.target.pose;
      const o = originOf(m);
      AXIS_NAMES.forEach((name, k) => {
        out.push({ kind: "segment", a: o, b: add(o, scale3(axisOf(m, k as 0 | 1 | 2), triad * 1.15)), role: `target-${name}` });
      });
      out.push({ kind: "label", at: o, text: "target", role: "target" });
    } else {
      out.push({ kind: "dot", at: item.target.point, role: "target" });
      out.push({ kind: "label", at: item.target.point, text: "target", role: "target" });
    }
  }
  if (item.trail !== null) {
    let prev: Vec3 | null = null;
    for (let k = 0; k <= f; k++) {
      const m = item.frames[k][item.trail as number];
      if (!m) continue;
      const o = originOf(m);
      if (prev) out.push({ kind: "segment", a: prev, b: o, role: "trail" });
      prev = o;
    }
  }
  for (const [a, b] of item.links) {
    const ma = scene[a];
    const mb = scene[b];
    if (ma && mb) out.push({ kind: "segment", a: originOf(ma), b: originOf(mb), role: item.style === "arm" ? "arm" : "link" });
  }
  scene.forEach((m, k) => {
    if (!m) return;
    const o = originOf(m);
    out.push({ kind: "dot", at: o, role: item.style === "arm" ? "joint" : "origin" });
    if (item.axes[k]) {
      AXIS_NAMES.forEach((name, j) => {
        const tip = add(o, scale3(axisOf(m, j as 0 | 1 | 2), triad));
        out.push({ kind: "segment", a: o, b: tip, role: name });
        out.push({ kind: "label", at: add(o, scale3(axisOf(m, j as 0 | 1 | 2), triad * 1.18)), text: name, role: name });
      });
    }
    if (item.labels[k]) out.push({ kind: "label", at: o, text: item.labels[k], role: "name" });
  });
  for (const e of ellipsoidsAt(item, f)) {
    for (const ring of ellipsoidRings(e)) ring.forEach((p, s) => out.push({ kind: "segment", a: p, b: ring[(s + 1) % ring.length], role: "ellipsoid" }));
    e.axes.forEach((a, k) => {
      const d = scale3(a, e.radii[k]);
      out.push({ kind: "segment", a: sub(e.center, d), b: add(e.center, d), role: "ellipsoid-axis" });
    });
    const top = e.axes.length === 3 ? ellipsoidPoint(e, [0, 0, 1]) : ellipsoidPoint(e, [0, 1]);
    if (e.label) out.push({ kind: "label", at: top, text: e.label, role: "ellipsoid" });
  }
  for (const a of arrowsAt(item, f)) {
    const tip = add(a.start, a.vec);
    out.push({ kind: "arrow", a: a.start, b: tip, role: "arrow" });
    if (a.label) out.push({ kind: "label", at: tip, text: a.label, role: "arrow" });
  }
  return out;
}

/** Depth of a shape for painter's sorting (bigger: further away, drawn first). */
export function shapeDepth(shape: Shape, cam: Camera, width: number, height: number): number | null {
  if (shape.kind === "segment" || shape.kind === "arrow") {
    const a = project(shape.a, cam, width, height);
    const b = project(shape.b, cam, width, height);
    return a && b ? (a.depth + b.depth) / 2 : null;
  }
  return project(shape.at, cam, width, height)?.depth ?? null;
}

const f2 = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
export const fmtVec = (v: Vec3) => `(${f2(v[0])}, ${f2(v[1])}, ${f2(v[2])})`;
const deg = (rad: number) => `${Math.round((rad * 180) / Math.PI)}°`;

/** The index of the transform the summary describes: the trail's, else the last usable one. */
function focusIndex(item: Frames3DItem, scene: (Mat34 | null)[]): number {
  if (item.trail !== null && scene[item.trail]) return item.trail;
  for (let k = scene.length - 1; k >= 0; k--) if (scene[k]) return k;
  return -1;
}

/**
 * One line for screen readers (and everyone): frame number, where each named frame
 * is, and where the focus frame's axes point. E.g. "Frame 3 of 31 · box at (0.50,
 * 0.00, 0.00), its x axis points (0.87, 0.50, 0.00), y (-0.50, 0.87, 0.00), z (0.00, 0.00, 1.00)".
 */
export function frames3dSummary(item: Frames3DItem, i: number): string {
  const f = Math.max(0, Math.min(i, item.frames.length - 1));
  const scene = item.frames[f];
  const parts = [`Frame ${f + 1} of ${item.frames.length}`];
  const k = focusIndex(item, scene);
  if (k === -1) return `${parts[0]} · nothing drawable in this frame`;
  const m = scene[k] as Mat34;
  const name = item.labels[k] || `frame ${k + 1}`;
  const others = scene
    .map((t, j) => ({ t, j }))
    .filter(({ t, j }) => t && j !== k && item.labels[j])
    .slice(0, 3)
    .map(({ t, j }) => `${item.labels[j]} at ${fmtVec(originOf(t as Mat34))}`);
  parts.push(...others);
  parts.push(`${name} at ${fmtVec(originOf(m))}, its x axis points ${fmtVec(axisOf(m, 0))}, y ${fmtVec(axisOf(m, 1))}, z ${fmtVec(axisOf(m, 2))}`);
  const lengths = ([0, 1, 2] as const).map((j) => norm3(axisOf(m, j)));
  if (lengths.some((l) => Math.abs(l - 1) > 0.01)) parts.push(`axis lengths ${lengths.map((l) => l.toFixed(2)).join(", ")} (not a pure rotation)`);
  if (item.target) {
    const t = "pose" in item.target ? originOf(item.target.pose) : item.target.point;
    parts.push(`target ${fmtVec(t)}, ${norm3(sub(originOf(m), t)).toFixed(3)} away`);
    if ("pose" in item.target) parts.push(`turned ${deg(angleBetween(m, item.target.pose))} from the target's orientation`);
  }
  for (const e of ellipsoidsAt(item, f)) parts.push(ellipsoidSummary(e));
  for (const a of arrowsAt(item, f)) parts.push(arrowSummary(a));
  return parts.join(" · ");
}

/** The angle of the rotation that takes `a`'s orientation to `b`'s (axes normalised first). */
export function angleBetween(a: Mat34, b: Mat34): number {
  const trace = ([0, 1, 2] as const).reduce((sum: number, k) => sum + dot3(normalize3(axisOf(a, k)), normalize3(axisOf(b, k))), 0);
  return Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2)));
}

/**
 * A label to draw on the canvas: its preferred spot in pixels, its size, and how much it matters.
 * `ax`/`ay` is the point it names (a frame origin, a target): when the label has to move away
 * from it, a leader line is drawn back to that point.
 */
export type LabelBox = { x: number; y: number; w: number; h: number; align: "left" | "center"; priority: number; ax?: number; ay?: number };
/** Where a label goes. `leader`, when set, is the point to draw a thin line to from the label. */
export type PlacedLabel = { x: number; y: number; shown: boolean; leader?: { x: number; y: number } };

/**
 * Keep canvas labels readable (audit flaw 17, QA O7): at the UR5e flange, the x/y/z letters of
 * frames 4-6 and the frame names piled up, and a name at the top edge was cut off.
 * - Labels are placed in priority order (names before axis letters), then left to right.
 * - Each label stays inside the canvas (with `pad` px to spare), with a `gap` px margin from the
 *   labels already placed and from the anchor dots (`ax`/`ay`) of the important ones.
 * - Its own spot first, then one line down or up. A name, target, point or arrow that still has
 *   no room moves out on a ring around its anchor (up to ~90 px) and gets a leader line back.
 * - An axis letter is never moved away from its tip (it would point at the wrong thing): if its
 *   spot is taken, it is skipped. It is still in the text summary under the canvas.
 * Returns positions in the input order.
 */
/** Labels at or above this priority are always drawn (moved inside the canvas if need be). */
const KEEP = 3;
/** Radii (px) and directions tried around the anchor for a crowded name. */
const RINGS = [30, 46, 62, 78, 94];
const DIRECTIONS = [90, 45, 135, 0, 180, -45, -135, -90].map((d) => (d * Math.PI) / 180); // down first, then sideways, then up

export function placeLabels(labels: LabelBox[], width: number, height: number, pad = 2, gap = 2): PlacedLabel[] {
  type Box = { l: number; t: number; r: number; b: number };
  const placed: Box[] = [];
  // The dots the important labels name: nothing should sit on them.
  for (const l of labels) {
    if (l.priority >= KEEP && l.ax !== undefined && l.ay !== undefined) placed.push({ l: l.ax - 4, t: l.ay - 4, r: l.ax + 4, b: l.ay + 4 });
  }
  const out: PlacedLabel[] = labels.map(() => ({ x: 0, y: 0, shown: false }));
  const order = labels.map((_, i) => i).sort((a, b) => labels[b].priority - labels[a].priority || labels[a].x - labels[b].x || a - b);
  const box = (l: LabelBox, x: number, y: number): Box => {
    const left = l.align === "center" ? x - l.w / 2 : x;
    return { l: left, t: y - l.h / 2, r: left + l.w, b: y + l.h / 2 };
  };
  const clampX = (l: LabelBox, x: number) => {
    const half = l.align === "center" ? l.w / 2 : 0;
    return Math.min(Math.max(x, pad + half), width - pad - (l.w - half));
  };
  const clampY = (l: LabelBox, y: number) => Math.min(Math.max(y, pad + l.h / 2), height - pad - l.h / 2);
  const hits = (a: Box) => placed.some((p) => a.l < p.r + gap && a.r > p.l - gap && a.t < p.b + gap && a.b > p.t - gap);
  const tryAt = (i: number, x: number, y: number, leader: boolean) => {
    const l = labels[i];
    const cx = clampX(l, x);
    const cy = clampY(l, y);
    const b = box(l, cx, cy);
    if (hits(b)) return false;
    placed.push(b);
    out[i] = { x: cx, y: cy, shown: true, ...(leader && l.ax !== undefined && l.ay !== undefined ? { leader: { x: l.ax, y: l.ay } } : {}) };
    return true;
  };
  for (const i of order) {
    const l = labels[i];
    const keep = l.priority >= KEEP;
    if (tryAt(i, l.x, l.y, false)) continue;
    if (!keep) continue; // an axis letter stays at its tip or is skipped
    if (tryAt(i, l.x, l.y + l.h + gap, false) || tryAt(i, l.x, l.y - l.h - gap, false)) continue;
    // Out on a ring around the anchor, with a leader line back to it.
    const ax = l.ax ?? l.x;
    const ay = l.ay ?? l.y;
    const half = l.align === "center" ? 0 : l.w / 2; // centre the box on the ring point
    let done = false;
    for (const r of RINGS) {
      for (const a of DIRECTIONS) {
        const dx = Math.cos(a) * (r + l.w / 2 - 10);
        const dy = Math.sin(a) * r;
        if (tryAt(i, ax + dx - half, ay + dy, true)) {
          done = true;
          break;
        }
      }
      if (done) break;
    }
    // Still no room: names, targets, points and arrows are never dropped, only kept inside the canvas.
    if (!done) {
      const x = clampX(l, l.x);
      const y = clampY(l, l.y);
      placed.push(box(l, x, y));
      out[i] = { x, y, shown: true };
    }
  }
  return out;
}

/** "View from 35° around, 25° up" (for the canvas's label and the e2e tests). */
export function viewSummary(cam: Camera): string {
  return `View from ${deg(cam.yaw)} around, ${deg(cam.pitch)} up`;
}
