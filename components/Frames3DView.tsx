"use client";
// The Lab viewer's 3D view: coordinate frames drawn by `viz.frames3d` / `viz.arm3d`
// (lib/runner/lab.py, parsed by lib/lab/viz.ts). A dependency-free canvas renderer:
// perspective projection from an orbit camera (lib/lab/view3d.ts), a grid on the
// floor (z = 0), each frame as a triad (x red, y green, z blue, and every tip
// labelled x / y / z so the colours are never the only cue), links between origins,
// a dashed target pose, points and a trail. Drag (mouse or touch) or the arrow keys
// turn the view, + / − zoom, 0 resets; the replay bar is the one the 2D arm uses.
// A text summary under the canvas says where every frame is and where its axes point.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Frames3DItem } from "@/lib/lab/viz";
import {
  defaultCamera,
  floorGrid,
  frames3dSummary,
  frameShapes,
  orbit,
  PITCH_STEP,
  project,
  sceneBounds,
  shapeDepth,
  triadLength,
  viewSummary,
  YAW_STEP,
  zoom,
  type Camera,
  type Shape,
} from "@/lib/lab/view3d";
import { ReplayBar, useReplay } from "./LabReplay";

/** The app's palette (Tailwind 400s on slate-950), as canvas colours. */
const C = {
  bg: "#020617", // slate-950
  grid: "#1e293b", // slate-800
  gridMain: "#334155", // slate-700
  x: "#f87171", // red-400
  y: "#4ade80", // green-400
  z: "#60a5fa", // blue-400
  link: "#cbd5e1", // slate-300
  arm: "#e2e8f0", // slate-200
  trail: "#a78bfa", // violet-400
  line: "#fbbf24", // amber-400
  target: "#fbbf24",
  point: "#f472b6", // pink-400
  text: "#e2e8f0",
};

const roleColor = (role: string): string =>
  role.endsWith("x") ? C.x : role.endsWith("y") ? C.y : role.endsWith("z") ? C.z : role === "arm" ? C.arm : role === "trail" ? C.trail : role === "line" ? C.line : C.link;

function draw(ctx: CanvasRenderingContext2D, item: Frames3DItem, frame: number, cam: Camera, w: number, h: number) {
  const { center, radius } = sceneBounds(item);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // The floor grid (z = 0); the lines through the origin a little brighter.
  const grid = floorGrid(center, radius);
  for (const [a, b] of grid.lines) {
    const pa = project(a, cam, w, h);
    const pb = project(b, cam, w, h);
    if (!pa || !pb) continue;
    const main = (Math.abs(a[0]) < 1e-9 && Math.abs(b[0]) < 1e-9) || (Math.abs(a[1]) < 1e-9 && Math.abs(b[1]) < 1e-9);
    ctx.strokeStyle = main ? C.gridMain : C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  // Everything else, back to front; labels last so they are always readable.
  const shapes = frameShapes(item, frame, triadLength(item, radius));
  const solid = shapes
    .filter((s) => s.kind !== "label")
    .map((s) => ({ s, d: shapeDepth(s, cam, w, h) }))
    .filter((x): x is { s: Exclude<Shape, { kind: "label" }>; d: number } => x.d !== null)
    .sort((a, b) => b.d - a.d);
  for (const { s } of solid) {
    if (s.kind === "segment") {
      const a = project(s.a, cam, w, h)!;
      const b = project(s.b, cam, w, h)!;
      const target = s.role.startsWith("target");
      ctx.strokeStyle = roleColor(s.role);
      ctx.globalAlpha = target ? 0.75 : s.role === "trail" ? 0.7 : 1;
      ctx.lineWidth = s.role === "arm" ? 7 : s.role === "link" ? 2 : s.role === "trail" || s.role === "line" ? 1.5 : 2.5;
      ctx.setLineDash(target || s.role === "line" ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else if (s.kind === "dot") {
      const p = project(s.at, cam, w, h)!;
      ctx.beginPath();
      if (s.role === "target") {
        ctx.strokeStyle = C.target;
        ctx.lineWidth = 2;
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.role === "joint") {
        ctx.fillStyle = C.bg;
        ctx.strokeStyle = C.arm;
        ctx.lineWidth = 2;
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = s.role === "point" ? C.point : C.arm;
        ctx.arc(p.x, p.y, s.role === "point" ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.textBaseline = "middle";
  for (const s of shapes) {
    if (s.kind !== "label") continue;
    const p = project(s.at, cam, w, h);
    if (!p) continue;
    const axis = s.role === "x" || s.role === "y" || s.role === "z";
    ctx.font = axis ? "bold 12px ui-sans-serif, system-ui, sans-serif" : "11px ui-sans-serif, system-ui, sans-serif";
    // Axis letters at the tips; a frame's name just under its origin; the target's name under that;
    // a point's name to its right. So labels that share a spot (a box sitting on its target) don't collide.
    ctx.textAlign = axis || s.role === "name" || s.role === "target" ? "center" : "left";
    const text = s.text;
    const x = s.role === "point" ? p.x + 8 : p.x;
    const y = axis || s.role === "point" ? p.y : s.role === "name" ? p.y + 13 : p.y + 26;
    // A dark halo keeps the text readable over lines.
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.bg;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = axis ? roleColor(s.role) : s.role === "point" ? C.point : s.role === "target" ? C.target : C.text;
    ctx.fillText(text, x, y);
  }
}

export default function Frames3DView({ item }: { item: Frames3DItem }) {
  const { frame, last, playing, toggle, scrub } = useReplay(item.frames.length);
  const { radius } = useMemo(() => sceneBounds(item), [item]);
  const [cam, setCam] = useState<Camera>(() => defaultCamera(item));
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const [width, setWidth] = useState(300);
  const height = Math.round(Math.min(340, Math.max(220, width * 0.78)));

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(200, Math.floor(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, item, frame, cam, width, height);
  }, [item, frame, cam, width, height]);

  const summary = frames3dSummary(item, frame);
  const view = viewSummary(cam);
  const turn = (dYaw: number, dPitch: number) => setCam((c) => orbit(c, dYaw, dPitch));
  const zoomBy = (factor: number) => setCam((c) => zoom(c, factor, radius));

  const onKeyDown = (e: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => turn(-YAW_STEP, 0),
      ArrowRight: () => turn(YAW_STEP, 0),
      ArrowUp: () => turn(0, PITCH_STEP),
      ArrowDown: () => turn(0, -PITCH_STEP),
      "+": () => zoomBy(1.25),
      "=": () => zoomBy(1.25),
      "-": () => zoomBy(0.8),
      "0": () => setCam(defaultCamera(item)),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    dragRef.current = { ...d, x: e.clientX, y: e.clientY };
    turn(-dx * 0.01, dy * 0.01);
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const deg = (r: number) => String(Math.round((r * 180) / Math.PI));
  const hasTarget = item.target !== null;
  const btn = "rounded-md bg-slate-800 px-2.5 py-1 text-sm text-white hover:bg-slate-700";
  return (
    <div data-testid="lab-3d">
      <div ref={wrapRef} className="w-full">
        <canvas
          ref={canvasRef}
          data-testid="lab-3d-canvas"
          data-frame={frame}
          data-yaw={deg(cam.yaw)}
          data-pitch={deg(cam.pitch)}
          data-dist={cam.dist.toFixed(2)}
          data-triads={item.axes.slice(0, item.frames[0]?.length ?? 0).filter(Boolean).length}
          tabIndex={0}
          role="img"
          aria-label={`${item.title}. ${summary}. ${view}. Drag or use the arrow keys to turn the view, plus and minus to zoom, 0 to reset.`}
          aria-roledescription="3D view"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ width, height }}
          className="block cursor-grab touch-none rounded-md active:cursor-grabbing"
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="lab-3d-zoom-in" aria-label="Zoom in" onClick={() => zoomBy(1.25)} className={btn}>
          ＋
        </button>
        <button type="button" data-testid="lab-3d-zoom-out" aria-label="Zoom out" onClick={() => zoomBy(0.8)} className={btn}>
          －
        </button>
        <button type="button" data-testid="lab-3d-turn-left" aria-label="Turn the view left" onClick={() => turn(-YAW_STEP, 0)} className={btn}>
          ⟲
        </button>
        <button type="button" data-testid="lab-3d-turn-right" aria-label="Turn the view right" onClick={() => turn(YAW_STEP, 0)} className={btn}>
          ⟳
        </button>
        <button type="button" data-testid="lab-3d-reset" onClick={() => setCam(defaultCamera(item))} className={`${btn} text-xs`}>
          Reset view
        </button>
        <span className="text-[11px] text-slate-400" data-testid="lab-3d-view">
          {view} · drag or ←↑→↓
        </span>
      </div>
      <ReplayBar frame={frame} last={last} playing={playing} onToggle={toggle} onScrub={scrub} valueText={summary} />
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-300" aria-label="Legend">
        <li>
          <span className="font-bold text-red-400">x</span> red
        </li>
        <li>
          <span className="font-bold text-green-400">y</span> green
        </li>
        <li>
          <span className="font-bold text-blue-400">z</span> blue
        </li>
        {hasTarget && (
          <li className="flex items-center gap-1">
            <span aria-hidden className="inline-block w-3 border-t-2 border-dashed border-amber-400" /> target
          </li>
        )}
        {item.trail !== null && (
          <li className="flex items-center gap-1">
            <span aria-hidden className="inline-block h-0.5 w-3 bg-violet-400" /> path so far
          </li>
        )}
        {item.points.length > 0 && (
          <li className="flex items-center gap-1">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-pink-400" /> points
          </li>
        )}
      </ul>
      {item.badBottom && (
        <p className="mt-1 text-[11px] font-semibold text-rose-300" data-testid="lab-3d-warning">
          ⚠️ A transform&apos;s bottom row is not [0, 0, 0, 1]: that is not a proper homogeneous transform (drawn from its top three rows).
        </p>
      )}
      <p className="mt-1 text-xs text-slate-300" data-testid="lab-3d-summary" aria-live={playing ? "off" : "polite"}>
        {summary}
      </p>
      {item.caption && <p className="mt-1 text-xs text-slate-400">{item.caption}</p>}
    </div>
  );
}
