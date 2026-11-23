// What a Robotics Lab run drew (`from lab import viz`, lib/runner/lab.py), as the
// browser sees it. The Python side already rounds and caps everything; parseViz()
// checks it again here, because it arrives from learner-controlled code: anything
// malformed is dropped, never thrown. Pure functions, so node can unit-test them.

/** Same limits as lib/runner/lab.py (the browser re-applies them). */
export const VIZ_LIMITS = {
  items: 12,
  frames: 400,
  points: 600,
  series: 6,
  links: 6,
  grid: 40,
  text: 120,
  transforms: 12,
  lines: 24,
  ellipsoids: 4,
  arrows: 8,
} as const;

export type Pt = [number, number];
export type Mark = { x: number; y: number; label: string; ok?: boolean };

export type ArmItem = {
  kind: "arm";
  name: string;
  title: string;
  caption: string;
  /** Link lengths, base at (0, 0). */
  lengths: number[];
  /** One pose per frame: a relative joint angle per link, in radians. */
  frames: number[][];
  target: Pt | null;
  /** Optional, one per frame. */
  targets?: (Pt | null)[];
  /** Optional, one per frame: where the learner's code says the gripper is. */
  ghost?: (Pt | null)[];
  marks?: Mark[];
  /** Optional (low, high) radians per joint. */
  limits?: [number, number][];
  /** Draw the gripper's path so far (default true). */
  trail: boolean;
  truncated: boolean;
};

export type Series = { label: string; xs: number[]; ys: (number | null)[] };
export type ChartItem = {
  kind: "chart";
  name: string;
  title: string;
  xLabel: string;
  yLabel: string;
  hline: number | null;
  log: boolean;
  series: Series[];
  truncated: boolean;
};

export type GridItem = {
  kind: "grid";
  name: string;
  title: string;
  xLabel: string;
  yLabel: string;
  values: (number | null)[][];
  path?: [number, number][];
  start: [number, number] | null;
  goal: [number, number] | null;
  arrows?: string[][];
  truncated: boolean;
};

export type PointsItem = {
  kind: "points";
  name: string;
  title: string;
  xLabel: string;
  yLabel: string;
  points: Pt[];
  labels?: (0 | 1)[];
  classes: [string, string];
  truncated: boolean;
};

/** A 3D point: [x, y, z]. */
export type Vec3 = [number, number, number];
/** The top three rows of a 4x4 homogeneous transform, row by row: [r00, r01, r02, px, r10, ..., pz]. */
export type Mat34 = number[];
export type Point3 = { x: number; y: number; z: number; label: string };
/**
 * An ellipsoid (e.g. a manipulability / velocity ellipsoid): its centre, its principal
 * directions (2 or 3 unit-ish vectors; 2: a flat ellipse) and one radius per direction.
 */
export type Ellipsoid3 = { center: Vec3; axes: Vec3[]; radii: number[]; label: string };
/** An arrow from `start` to `start + vec` (a velocity, a force). */
export type Arrow3 = { start: Vec3; vec: Vec3; label: string };

/** 3D coordinate frames (viz.frames3d / viz.arm3d): 4x4 transforms per frame of the animation. */
export type Frames3DItem = {
  kind: "frames3d";
  name: string;
  title: string;
  caption: string;
  /** "arm": links drawn as a thick arm (viz.arm3d); "frames": thin links. */
  style: "frames" | "arm";
  /** One scene per animation frame; each a list of world poses (null: not a usable matrix). */
  frames: (Mat34 | null)[][];
  /** One per transform: draw its triad? */
  axes: boolean[];
  labels: string[];
  /** Pairs of transform indices joined by a line (origin to origin). */
  links: [number, number][];
  points: Point3[];
  lines: [Vec3, Vec3][];
  target: { pose: Mat34 } | { point: Vec3 } | null;
  /** Index of the transform whose origin leaves a trail. */
  trail: number | null;
  /** Triad length; null: picked from the scene's size. */
  scale: number | null;
  /** Some transform's bottom row was not [0, 0, 0, 1]. */
  badBottom: boolean;
  /** One list per animation frame (empty: none drawn). */
  ellipsoids: Ellipsoid3[][];
  /** One list per animation frame (empty: none drawn). */
  arrows: Arrow3[][];
  truncated: boolean;
};

export type VizItem = ArmItem | ChartItem | GridItem | PointsItem | Frames3DItem;

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const text = (v: unknown): string => (typeof v === "string" ? v.slice(0, VIZ_LIMITS.text) : "");
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);

function pt(v: unknown): Pt | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const x = num(v[0]);
  const y = num(v[1]);
  return x === null || y === null ? null : [x, y];
}

function cell(v: unknown): [number, number] | null {
  const p = pt(v);
  return p && Number.isInteger(p[0]) && Number.isInteger(p[1]) ? p : null;
}

function parseArm(r: Raw): ArmItem | null {
  const lengths = arr(r.lengths, VIZ_LIMITS.links).map(num);
  if (lengths.length === 0 || lengths.some((l) => l === null || l <= 0)) return null;
  const n = lengths.length;
  const frames = arr(r.frames, VIZ_LIMITS.frames)
    .map((f) => (Array.isArray(f) && f.length === n ? f.map(num) : null))
    .filter((f): f is number[] => !!f && f.every((a) => a !== null));
  if (frames.length === 0) return null;
  const perFrame = (v: unknown) => (Array.isArray(v) ? arr(v, VIZ_LIMITS.frames).map(pt) : undefined);
  const limits = arr(r.limits, VIZ_LIMITS.links).map(pt);
  const item: ArmItem = {
    kind: "arm",
    name: text(r.name),
    title: text(r.title) || "Grabby's arm",
    caption: text(r.caption),
    lengths: lengths as number[],
    frames,
    target: pt(r.target),
    trail: r.trail !== false,
    truncated: r.truncated === true,
  };
  const targets = perFrame(r.targets);
  const ghost = perFrame(r.ghost);
  if (targets) item.targets = targets;
  if (ghost) item.ghost = ghost;
  if (Array.isArray(r.marks)) {
    const marks: Mark[] = [];
    for (const m of arr(r.marks, VIZ_LIMITS.points).filter(isObj)) {
      const x = num(m.x);
      const y = num(m.y);
      if (x === null || y === null) continue;
      marks.push(typeof m.ok === "boolean" ? { x, y, label: text(m.label), ok: m.ok } : { x, y, label: text(m.label) });
    }
    item.marks = marks;
  }
  if (limits.length === n && limits.every((l) => l !== null && l[0] <= l[1])) item.limits = limits as [number, number][];
  return item;
}

function parseChart(r: Raw): ChartItem | null {
  const series = arr(r.series, VIZ_LIMITS.series)
    .filter(isObj)
    .map((s) => {
      const xs = arr(s.xs, VIZ_LIMITS.points).map(num);
      const ys = arr(s.ys, VIZ_LIMITS.points).map(num);
      const len = Math.min(xs.length, ys.length);
      // Points without an x can't be placed: drop them. A missing y (an exploded loss) is kept as a gap.
      const keep = Array.from({ length: len }, (_, i) => i).filter((i) => xs[i] !== null);
      return { label: text(s.label), xs: keep.map((i) => xs[i] as number), ys: keep.map((i) => ys[i]) };
    })
    .filter((s) => s.xs.length > 0);
  if (series.length === 0) return null;
  return {
    kind: "chart",
    name: text(r.name),
    title: text(r.title),
    xLabel: text(r.x_label),
    yLabel: text(r.y_label),
    hline: num(r.hline),
    log: r.log === true,
    series,
    truncated: r.truncated === true,
  };
}

function parseGrid(r: Raw): GridItem | null {
  const values = arr(r.values, VIZ_LIMITS.grid).map((row) => arr(row, VIZ_LIMITS.grid).map(num));
  if (values.length === 0 || values.every((row) => row.length === 0)) return null;
  const item: GridItem = {
    kind: "grid",
    name: text(r.name),
    title: text(r.title),
    xLabel: text(r.x_label),
    yLabel: text(r.y_label),
    values,
    start: cell(r.start),
    goal: cell(r.goal),
    truncated: r.truncated === true,
  };
  if (Array.isArray(r.path)) item.path = arr(r.path, VIZ_LIMITS.points).map(cell).filter((c): c is [number, number] => !!c);
  if (Array.isArray(r.arrows)) item.arrows = arr(r.arrows, VIZ_LIMITS.grid).map((row) => arr(row, VIZ_LIMITS.grid).map((a) => text(a).slice(0, 2)));
  return item;
}

function parsePoints(r: Raw): PointsItem | null {
  const raw = arr(r.points, VIZ_LIMITS.points).map(pt);
  const labelsRaw = Array.isArray(r.labels) ? arr(r.labels, VIZ_LIMITS.points) : null;
  const keep = raw.map((p, i) => i).filter((i) => raw[i] !== null);
  if (keep.length === 0) return null;
  const classes = arr(r.classes, 2).map(text);
  const item: PointsItem = {
    kind: "points",
    name: text(r.name),
    title: text(r.title),
    xLabel: text(r.x_label),
    yLabel: text(r.y_label),
    points: keep.map((i) => raw[i] as Pt),
    classes: [classes[0] || "0", classes[1] || "1"],
    truncated: r.truncated === true,
  };
  if (labelsRaw && labelsRaw.length === raw.length) item.labels = keep.map((i) => (labelsRaw[i] ? 1 : 0));
  return item;
}

function vec3(v: unknown): Vec3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const out = v.map(num);
  return out.every((x) => x !== null) ? (out as Vec3) : null;
}

function mat34(v: unknown): Mat34 | null {
  if (!Array.isArray(v) || v.length !== 12) return null;
  const out = v.map(num);
  return out.every((x) => x !== null) ? (out as number[]) : null;
}

/** An ellipsoid: a centre, 2 or 3 axes and as many finite, non-negative radii; anything else is dropped. */
export function parseEllipsoid(v: unknown): Ellipsoid3 | null {
  if (!isObj(v)) return null;
  const center = vec3(v.center);
  if (!center || !Array.isArray(v.axes) || !Array.isArray(v.radii)) return null;
  const axes = v.axes.map(vec3);
  const radii = v.radii.map(num);
  if ((axes.length !== 2 && axes.length !== 3) || radii.length !== axes.length) return null;
  if (axes.some((a) => a === null) || radii.some((r) => r === null || r < 0)) return null;
  return { center, axes: axes as Vec3[], radii: radii as number[], label: text(v.label) };
}

export function parseArrow(v: unknown): Arrow3 | null {
  if (!isObj(v)) return null;
  const start = vec3(v.start);
  const vec = vec3(v.vec);
  return start && vec ? { start, vec, label: text(v.label) } : null;
}

/** One list per frame, each capped; broken entries dropped. */
function perFrame<T>(v: unknown, frames: number, cap: number, parse: (x: unknown) => T | null): T[][] {
  return arr(v, frames).map((f) => arr(f, cap).map(parse).filter((x): x is T => x !== null));
}

function parseFrames3d(r: Raw): Frames3DItem | null {
  const frames = arr(r.frames, VIZ_LIMITS.frames)
    .map((scene) => (Array.isArray(scene) ? arr(scene, VIZ_LIMITS.transforms).map(mat34) : null))
    .filter((scene): scene is (Mat34 | null)[] => !!scene && scene.length > 0);
  if (frames.length === 0 || frames.every((scene) => scene.every((m) => m === null))) return null;
  const count = Math.max(...frames.map((scene) => scene.length));
  const inRange = (i: unknown): i is number => typeof i === "number" && Number.isInteger(i) && i >= 0 && i < count;
  const axesRaw = Array.isArray(r.axes) ? arr(r.axes, VIZ_LIMITS.transforms) : [];
  const points: Point3[] = [];
  for (const p of arr(r.points, VIZ_LIMITS.points).filter(isObj)) {
    const x = num(p.x);
    const y = num(p.y);
    const z = num(p.z);
    if (x !== null && y !== null && z !== null) points.push({ x, y, z, label: text(p.label) });
  }
  const lines = arr(r.lines, VIZ_LIMITS.lines)
    .map((l) => (Array.isArray(l) && l.length === 2 ? [vec3(l[0]), vec3(l[1])] : null))
    .filter((l): l is [Vec3, Vec3] => !!l && l[0] !== null && l[1] !== null);
  let target: Frames3DItem["target"] = null;
  if (isObj(r.target)) {
    const pose = mat34(r.target.pose);
    const point = vec3(r.target.point);
    target = pose ? { pose } : point ? { point } : null;
  }
  const scale = num(r.scale);
  const labels = Array.isArray(r.labels) ? r.labels : [];
  return {
    kind: "frames3d",
    name: text(r.name),
    title: text(r.title) || "Frames",
    caption: text(r.caption),
    style: r.style === "arm" ? "arm" : "frames",
    frames,
    axes: Array.from({ length: count }, (_, i) => (axesRaw.length ? axesRaw[i] === true : true)),
    labels: Array.from({ length: count }, (_, i) => text(labels[i])),
    links: arr(r.links, VIZ_LIMITS.transforms * 2)
      .map((l) => (Array.isArray(l) && l.length === 2 && inRange(l[0]) && inRange(l[1]) ? ([l[0], l[1]] as [number, number]) : null))
      .filter((l): l is [number, number] => !!l),
    points,
    lines,
    target,
    trail: inRange(r.trail) ? r.trail : null,
    scale: scale !== null && scale > 0 ? scale : null,
    badBottom: r.bad_bottom === true,
    ellipsoids: perFrame(r.ellipsoids, VIZ_LIMITS.frames, VIZ_LIMITS.ellipsoids, parseEllipsoid),
    arrows: perFrame(r.arrows, VIZ_LIMITS.frames, VIZ_LIMITS.arrows, parseArrow),
    truncated: r.truncated === true,
  };
}

/** The run's "viz" list, cleaned. Never throws; unknown or broken items are dropped. */
export function parseViz(raw: unknown): VizItem[] {
  if (!Array.isArray(raw)) return [];
  const out: VizItem[] = [];
  for (const r of raw) {
    if (out.length >= VIZ_LIMITS.items) break;
    if (!isObj(r)) continue;
    const item =
      r.kind === "arm" ? parseArm(r) : r.kind === "chart" ? parseChart(r) : r.kind === "grid" ? parseGrid(r) : r.kind === "points" ? parsePoints(r) : r.kind === "frames3d" ? parseFrames3d(r) : null;
    if (item) out.push(item);
  }
  return out;
}

// ---------- geometry for the arm viewer ----------

/** Joint positions of a planar arm: [base, joint 2, ..., gripper]. Angles are relative, in radians. */
export function jointPositions(lengths: number[], pose: number[]): Pt[] {
  const pts: Pt[] = [[0, 0]];
  let x = 0;
  let y = 0;
  let angle = 0;
  lengths.forEach((l, i) => {
    angle += pose[i] ?? 0;
    x += l * Math.cos(angle);
    y += l * Math.sin(angle);
    pts.push([x, y]);
  });
  return pts;
}

/** Where the gripper is in a pose. */
export function gripper(lengths: number[], pose: number[]): Pt {
  return jointPositions(lengths, pose).at(-1)!;
}

/** Inner and outer radius of the ring a planar arm without joint limits can reach. */
export function reachRing(lengths: number[]): { inner: number; outer: number } {
  const outer = lengths.reduce((a, b) => a + b, 0);
  const longest = Math.max(...lengths);
  return { inner: Math.max(0, longest - (outer - longest)), outer };
}

/**
 * Gripper positions reachable within joint limits, by sampling each joint evenly
 * (`steps` values per joint; capped so the total stays small). For shading.
 */
export function reachableSamples(lengths: number[], limits: [number, number][], steps = 24): Pt[] {
  const n = lengths.length;
  const per = Math.max(2, Math.min(steps, Math.floor(Math.pow(4000, 1 / n))));
  const out: Pt[] = [];
  const pose = new Array<number>(n).fill(0);
  const walk = (j: number) => {
    if (j === n) {
      out.push(gripper(lengths, pose));
      return;
    }
    const [lo, hi] = limits[j];
    for (let k = 0; k < per; k++) {
      pose[j] = lo + ((hi - lo) * k) / (per - 1);
      walk(j + 1);
    }
  };
  walk(0);
  return out;
}

/** The square view box (in arm units) that fits the arm's full reach, its targets and marks. */
export function armBounds(item: ArmItem): { min: number; max: number } {
  let r = reachRing(item.lengths).outer;
  const extra: (Pt | null)[] = [item.target, ...(item.targets ?? []), ...(item.ghost ?? []), ...(item.marks ?? []).map((m) => [m.x, m.y] as Pt)];
  for (const p of extra) if (p) r = Math.max(r, Math.abs(p[0]), Math.abs(p[1]));
  r *= 1.1;
  return { min: -r, max: r };
}

const fmt = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
export const fmtPt = (p: Pt) => `(${fmt(p[0])}, ${fmt(p[1])})`;
const deg = (rad: number) => `${Math.round((rad * 180) / Math.PI)}°`;

/** One line for screen readers (and everyone): where the arm is in frame `i`. */
export function armFrameSummary(item: ArmItem, i: number): string {
  const f = Math.max(0, Math.min(i, item.frames.length - 1));
  const pose = item.frames[f];
  const g = gripper(item.lengths, pose);
  const target = item.targets?.[f] ?? item.target;
  const parts = [`Frame ${f + 1} of ${item.frames.length}`, `joints ${pose.map(deg).join(", ")}`, `gripper at ${fmtPt(g)}`];
  if (target) parts.push(`target ${fmtPt(target)}, ${Math.hypot(g[0] - target[0], g[1] - target[1]).toFixed(3)} away`);
  const ghost = item.ghost?.[f];
  if (ghost) parts.push(`your code says ${fmtPt(ghost)}`);
  return parts.join(" · ");
}

/** "Loss: 2 lines, 20 points; train falls from 0.25 to 0.002 (last)". */
export function chartSummary(item: ChartItem): string {
  const lines = item.series.map((s) => {
    const ys = s.ys;
    const first = ys.find((y) => y !== null);
    const last = [...ys].reverse().find((y) => y !== null);
    const gaps = ys.filter((y) => y === null).length;
    const name = s.label || "line";
    if (first === undefined || last === undefined) return `${name}: no finite values (it blew up)`;
    const blew = gaps ? ` (${gaps} values not finite: it blew up)` : "";
    if (last === first) return `${name} stays at ${short(first)}${blew}`;
    return `${name} ${last < first ? "falls" : "rises"} from ${short(first)} to ${short(last)}${blew}`;
  });
  return `${item.title}: ${lines.join("; ")}${item.hline !== null ? `; target line at ${short(item.hline)}` : ""}.`;
}

export function short(v: number): string {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(1);
  return String(Number(v.toPrecision(3)));
}

/** "Q-values: 7 × 9 grid, path of 6 cells from (0, 4), reaches the goal". */
export function gridSummary(item: GridItem): string {
  const rows = item.values.length;
  const cols = Math.max(...item.values.map((r) => r.length));
  const parts = [`${item.title}: ${rows} × ${cols} grid`];
  if (item.path?.length) {
    const end = item.path.at(-1)!;
    const reaches = item.goal && end[0] === item.goal[0] && end[1] === item.goal[1];
    parts.push(`path of ${item.path.length} cells ${reaches ? "reaches the goal" : "does not reach the goal"}`);
  }
  return parts.join(", ") + ".";
}

/** "Grasps: 120 points, 70 success / 50 fail". */
export function pointsSummary(item: PointsItem): string {
  if (!item.labels) return `${item.title}: ${item.points.length} points.`;
  const ones = item.labels.filter((l) => l === 1).length;
  return `${item.title}: ${item.points.length} points, ${ones} ${item.classes[1]} and ${item.points.length - ones} ${item.classes[0]}.`;
}

/** Evenly spaced "nice" ticks between lo and hi (about `count`). */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}
