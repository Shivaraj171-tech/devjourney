"use client";
// The Lab viewer: what a Robotics Lab run drew with `from lab import viz`
// (lib/runner/lab.py, parsed by lib/lab/viz.ts), shown next to the CI checks.
//   - arm:    an n-link planar arm, animated (play / pause / replay, a keyboard
//             slider), with the target, the reachable workspace shaded, and a
//             cross where the learner's code says the gripper is.
//   - chart:  line charts (loss, reward, joint angle vs target), hover to read values.
//   - grid:   a heat-map grid (a Q-table) with the policy's path.
//   - points: a scatter plot of labelled points (grasp attempts).
//   - frames3d: 3D coordinate frames / a 3D arm (Frames3DView.tsx): orbit, zoom, replay.
// Every item has a plain-text summary under it, so nothing is colour-only or
// picture-only. Colours: Tailwind's cyan-600 / amber-600 / violet-500 / lime-600
// for series (checked for colour-blind separation on the slate-900 surface).
import { useId, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  armBounds,
  armFrameSummary,
  chartSummary,
  gridSummary,
  jointPositions,
  niceTicks,
  pointsSummary,
  reachableSamples,
  reachRing,
  short,
  type ArmItem,
  type ChartItem,
  type GridItem,
  type PointsItem,
  type Pt,
  type VizItem,
} from "@/lib/lab/viz";
import Frames3DView from "./Frames3DView";
import { ReplayBar, useReplay } from "./LabReplay";

/** Series colours, in a fixed order (never cycled past 4: a 5th+ line reuses the last with a dash). */
const SERIES = [
  { stroke: "stroke-cyan-600", fill: "fill-cyan-600", bg: "bg-cyan-600" },
  { stroke: "stroke-amber-600", fill: "fill-amber-600", bg: "bg-amber-600" },
  { stroke: "stroke-violet-500", fill: "fill-violet-500", bg: "bg-violet-500" },
  { stroke: "stroke-lime-600", fill: "fill-lime-600", bg: "bg-lime-600" },
];
const seriesStyle = (i: number) => SERIES[Math.min(i, SERIES.length - 1)];

export default function LabViewer({ items }: { items: VizItem[] }) {
  if (items.length === 0) return null;
  return (
    <section data-testid="lab-viewer" aria-labelledby="lab-viewer-title" className="mb-3 rounded-xl border border-cyan-500/30 bg-slate-950/60 p-3">
      <h3 id="lab-viewer-title" className="text-xs font-semibold tracking-wide text-cyan-200 uppercase">
        🔭 Lab viewer <span className="font-normal normal-case text-slate-400">· what your code just did</span>
      </h3>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <figure
            key={`${item.kind}-${item.name}-${i}`}
            data-testid={`lab-${item.kind}`}
            data-name={item.name}
            className={`min-w-0 rounded-lg border border-slate-800 bg-slate-900/70 p-2 ${item.kind === "frames3d" ? "sm:col-span-2" : ""}`}
          >
            <figcaption className="mb-1 text-sm font-semibold text-white">{item.title || item.name}</figcaption>
            {item.kind === "arm" && <ArmView item={item} />}
            {item.kind === "chart" && <ChartView item={item} />}
            {item.kind === "grid" && <GridView item={item} />}
            {item.kind === "points" && <PointsView item={item} />}
            {item.kind === "frames3d" && <Frames3DView item={item} />}
            {item.truncated && <p className="mt-1 text-[11px] text-slate-400">Long recording: thinned to fit the viewer.</p>}
          </figure>
        ))}
      </div>
    </section>
  );
}

// ---------- the arm ----------

function ArmView({ item }: { item: ArmItem }) {
  // Plays once from the start (reduced motion: shows the last frame, no autoplay).
  const { frame, last, playing, toggle, scrub } = useReplay(item.frames.length);

  const { min, max } = useMemo(() => armBounds(item), [item]);
  const span = max - min;
  const unit = span / 100; // stroke widths and marker sizes scale with the view
  const pose = item.frames[frame];
  const joints = jointPositions(item.lengths, pose);
  const grip = joints.at(-1)!;
  const target = item.targets?.[frame] ?? item.target;
  const ghost = item.ghost?.[frame] ?? null;
  const trail = useMemo(() => item.frames.map((f) => jointPositions(item.lengths, f).at(-1)!), [item]);
  const ring = reachRing(item.lengths);
  const samples = useMemo(() => (item.limits ? reachableSamples(item.lengths, item.limits) : null), [item]);
  const summary = armFrameSummary(item, frame);
  // SVG y grows downwards: flip it, so up is up.
  const P = (p: Pt) => `${p[0]},${-p[1]}`;

  return (
    <div>
      <svg
        viewBox={`${min} ${min} ${span} ${span}`}
        className="mx-auto block aspect-square w-full max-w-[260px]"
        role="img"
        aria-label={`${item.title}. ${summary}`}
        data-testid="lab-arm-svg"
        data-frame={frame}
      >
        {/* axes */}
        <line x1={min} y1={0} x2={max} y2={0} className="stroke-slate-800" strokeWidth={unit * 0.4} />
        <line x1={0} y1={min} x2={0} y2={max} className="stroke-slate-800" strokeWidth={unit * 0.4} />
        {/* where the gripper can reach */}
        {samples ? (
          <g data-testid="lab-workspace" data-shape="limits" className="fill-cyan-500/15">
            {samples.map((p, i) => (
              <circle key={i} cx={p[0]} cy={-p[1]} r={unit * 1.6} />
            ))}
          </g>
        ) : (
          <path
            data-testid="lab-workspace"
            data-shape="ring"
            fillRule="evenodd"
            className="fill-cyan-500/10 stroke-cyan-500/30"
            strokeWidth={unit * 0.3}
            d={`M ${ring.outer} 0 A ${ring.outer} ${ring.outer} 0 1 0 ${-ring.outer} 0 A ${ring.outer} ${ring.outer} 0 1 0 ${ring.outer} 0 Z ${
              ring.inner > 0 ? `M ${ring.inner} 0 A ${ring.inner} ${ring.inner} 0 1 0 ${-ring.inner} 0 A ${ring.inner} ${ring.inner} 0 1 0 ${ring.inner} 0 Z` : ""
            }`}
          />
        )}
        {/* the path the gripper has taken so far */}
        {item.trail && frame > 0 && (
          <polyline points={trail.slice(0, frame + 1).map(P).join(" ")} className="fill-none stroke-violet-400/60" strokeWidth={unit * 0.6} strokeLinejoin="round" />
        )}
        {/* marks (e.g. targets checked: reachable or not) */}
        {item.marks?.map((m, i) => (
          <g key={i} className={m.ok === false ? "stroke-rose-400" : m.ok ? "stroke-emerald-400" : "stroke-slate-300"} strokeWidth={unit * 0.7}>
            {m.ok === false ? (
              <path d={`M ${m.x - unit * 2} ${-m.y - unit * 2} l ${unit * 4} ${unit * 4} m 0 ${-unit * 4} l ${-unit * 4} ${unit * 4}`} />
            ) : (
              <circle cx={m.x} cy={-m.y} r={unit * 2} className="fill-none" />
            )}
          </g>
        ))}
        {/* the target */}
        {target && (
          <g data-testid="lab-target" className="fill-none stroke-amber-400" strokeWidth={unit * 0.7}>
            <circle cx={target[0]} cy={-target[1]} r={unit * 3.2} />
            <circle cx={target[0]} cy={-target[1]} r={unit * 1.2} className="fill-amber-400" />
          </g>
        )}
        {/* the arm: links, joints, gripper */}
        <polyline points={joints.map(P).join(" ")} className="fill-none stroke-slate-200" strokeWidth={unit * 2.4} strokeLinecap="round" strokeLinejoin="round" />
        {joints.slice(0, -1).map((j, i) => (
          <circle key={i} cx={j[0]} cy={-j[1]} r={unit * (i === 0 ? 2.6 : 1.8)} className="fill-slate-950 stroke-slate-200" strokeWidth={unit * 0.8} />
        ))}
        <circle data-testid="lab-gripper" cx={grip[0]} cy={-grip[1]} r={unit * 1.8} className="fill-cyan-300" />
        {/* where the learner's code says the gripper is */}
        {ghost && (
          <g data-testid="lab-ghost" className="stroke-pink-400" strokeWidth={unit * 0.8}>
            <line x1={grip[0]} y1={-grip[1]} x2={ghost[0]} y2={-ghost[1]} strokeDasharray={`${unit * 1.5} ${unit * 1.5}`} strokeWidth={unit * 0.4} />
            <path d={`M ${ghost[0] - unit * 2.4} ${-ghost[1] - unit * 2.4} l ${unit * 4.8} ${unit * 4.8} m 0 ${-unit * 4.8} l ${-unit * 4.8} ${unit * 4.8}`} />
          </g>
        )}
      </svg>
      <ReplayBar frame={frame} last={last} playing={playing} onToggle={toggle} onScrub={scrub} valueText={summary} />
      <Legend
        entries={[
          { swatch: <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-300" />, label: "gripper" },
          ...(target ? [{ swatch: <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-amber-400" />, label: "target" }] : []),
          ...(item.ghost ? [{ swatch: <span className="font-bold text-pink-400">✕</span>, label: "your code's answer" }] : []),
          { swatch: <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan-500/30" />, label: item.limits ? "reachable within limits" : "reachable" },
        ]}
      />
      <p className="mt-1 text-xs text-slate-300" data-testid="lab-arm-summary" aria-live={playing ? "off" : "polite"}>
        {summary}
      </p>
      {item.caption && <p className="mt-1 text-xs text-slate-400">{item.caption}</p>}
    </div>
  );
}

function Legend({ entries }: { entries: { swatch: ReactNode; label: string }[] }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
      {entries.map((e) => (
        <li key={e.label} className="flex items-center gap-1">
          <span aria-hidden className="inline-flex w-3 justify-center">
            {e.swatch}
          </span>
          {e.label}
        </li>
      ))}
    </ul>
  );
}

// ---------- shared plot frame ----------

const W = 320;
const H = 180;
const PAD = { l: 40, r: 12, t: 10, b: 28 };

type Scale = { to: (v: number) => number; ticks: number[]; fmt: (v: number) => string };

function linear(lo: number, hi: number, a: number, b: number): Scale {
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  return { to: (v) => a + ((v - lo) / (hi - lo)) * (b - a), ticks: niceTicks(lo, hi, 4), fmt: short };
}

function logScale(lo: number, hi: number, a: number, b: number): Scale {
  const l0 = Math.floor(Math.log10(lo));
  const l1 = Math.max(l0 + 1, Math.ceil(Math.log10(hi)));
  const every = Math.max(1, Math.ceil((l1 - l0) / 5));
  const ticks: number[] = [];
  for (let e = l0; e <= l1; e += every) ticks.push(Math.pow(10, e));
  return { to: (v) => a + ((Math.log10(v) - l0) / (l1 - l0)) * (b - a), ticks, fmt: short };
}

function Axes({ x, y, xLabel, yLabel }: { x: Scale; y: Scale; xLabel: string; yLabel: string }) {
  return (
    <g className="text-[10px]">
      {y.ticks.map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y.to(t)} y2={y.to(t)} className="stroke-slate-800" strokeWidth={1} />
          <text x={PAD.l - 4} y={y.to(t) + 3} textAnchor="end" className="fill-slate-400">
            {y.fmt(t)}
          </text>
        </g>
      ))}
      {x.ticks.map((t) => (
        <text key={`x${t}`} x={x.to(t)} y={H - PAD.b + 12} textAnchor="middle" className="fill-slate-400">
          {x.fmt(t)}
        </text>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="stroke-slate-600" strokeWidth={1} />
      {xLabel && (
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 3} textAnchor="middle" className="fill-slate-400">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={10} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(PAD.t + H - PAD.b) / 2})`} className="fill-slate-400">
          {yLabel}
        </text>
      )}
    </g>
  );
}

// ---------- line charts ----------

function ChartView({ item }: { item: ChartItem }) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();
  const allX = item.series.flatMap((s) => s.xs);
  const finite = item.series.flatMap((s) => s.ys.filter((y): y is number => y !== null && (!item.log || y > 0)));
  if (item.hline !== null && (!item.log || item.hline > 0)) finite.push(item.hline);
  const xlo = Math.min(...allX);
  const xhi = Math.max(...allX);
  const x = linear(xlo, xhi, PAD.l, W - PAD.r);
  const ylo = finite.length ? Math.min(...finite) : 0;
  const yhi = finite.length ? Math.max(...finite) : 1;
  const y = item.log && finite.length ? logScale(ylo, yhi, H - PAD.b, PAD.t) : linear(Math.min(ylo, item.log ? ylo : Math.min(0, ylo)), yhi, H - PAD.b, PAD.t);
  const ok = (v: number | null): v is number => v !== null && (!item.log || v > 0);
  // Split each line at missing values (a loss that blew up), so the gap shows.
  const segments = (s: ChartItem["series"][number]) => {
    const out: string[][] = [];
    let cur: string[] = [];
    s.xs.forEach((xv, i) => {
      const yv = s.ys[i];
      if (ok(yv)) cur.push(`${x.to(xv).toFixed(1)},${y.to(yv).toFixed(1)}`);
      else if (cur.length) {
        out.push(cur);
        cur = [];
      }
    });
    if (cur.length) out.push(cur);
    return out;
  };
  // Hover: the nearest x of the first line.
  const xsRef = item.series[0].xs;
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    xsRef.forEach((xv, i) => {
      if (Math.abs(x.to(xv) - px) < Math.abs(x.to(xsRef[best]) - px)) best = i;
    });
    setHover(best);
  };
  const exploded = item.series.some((s) => s.ys.some((v) => v === null));
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none"
        role="img"
        aria-label={chartSummary(item)}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.l} y={PAD.t - 4} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b + 4} />
          </clipPath>
        </defs>
        <Axes x={x} y={y} xLabel={item.xLabel} yLabel={item.yLabel + (item.log ? " (log)" : "")} />
        <g clipPath={`url(#${clipId})`}>
          {item.hline !== null && ok(item.hline) && (
            <line
              data-testid="lab-hline"
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y.to(item.hline)}
              y2={y.to(item.hline)}
              className="stroke-slate-300"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}
          {item.series.map((s, i) =>
            segments(s).map((pts, k) => (
              <polyline
                key={`${i}-${k}`}
                data-testid="lab-line"
                points={pts.join(" ")}
                className={`fill-none ${seriesStyle(i).stroke}`}
                strokeWidth={2}
                strokeDasharray={i >= SERIES.length ? "5 3" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )),
          )}
          {hover !== null && <line x1={x.to(xsRef[hover])} x2={x.to(xsRef[hover])} y1={PAD.t} y2={H - PAD.b} className="stroke-slate-500" strokeWidth={1} />}
          {hover !== null &&
            item.series.map((s, i) => {
              const yv = s.ys[hover];
              return ok(yv) && s.xs[hover] !== undefined ? (
                <circle key={i} cx={x.to(s.xs[hover])} cy={y.to(yv)} r={3.5} className={`${seriesStyle(i).fill} stroke-slate-900`} strokeWidth={1.5} />
              ) : null;
            })}
        </g>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1 text-[11px] text-slate-200 shadow" role="status">
          <div className="text-slate-400">
            {item.xLabel || "x"} {short(xsRef[hover])}
          </div>
          {item.series.map((s, i) => (
            <div key={i}>
              {s.label}: <span className="font-mono">{s.ys[hover] === null || s.ys[hover] === undefined ? "∞ / not a number" : short(s.ys[hover] as number)}</span>
            </div>
          ))}
        </div>
      )}
      {item.series.length > 1 && (
        <Legend
          entries={[
            ...item.series.map((s, i) => ({ swatch: <span className={`inline-block h-0.5 w-3 ${seriesStyle(i).bg}`} />, label: s.label })),
            ...(item.hline !== null ? [{ swatch: <span className="inline-block w-3 border-t border-dashed border-slate-300" />, label: `target ${short(item.hline)}` }] : []),
          ]}
        />
      )}
      {item.series.length === 1 && item.hline !== null && (
        <Legend entries={[{ swatch: <span className="inline-block w-3 border-t border-dashed border-slate-300" />, label: `target ${short(item.hline)}` }]} />
      )}
      {exploded && <p className="mt-1 text-[11px] font-semibold text-rose-300">⚠️ Some values were not finite (∞ or NaN): the numbers blew up.</p>}
      <p className="mt-1 text-xs text-slate-300" data-testid="lab-chart-summary">
        {chartSummary(item)}
      </p>
    </div>
  );
}

// ---------- grids (Q-tables) ----------

function GridView({ item }: { item: GridItem }) {
  const rows = item.values.length;
  const cols = Math.max(...item.values.map((r) => r.length));
  const cell = Math.min(36, Math.floor(300 / Math.max(rows, cols)));
  const flat = item.values.flat().filter((v): v is number => v !== null);
  const lo = flat.length ? Math.min(...flat) : 0;
  const hi = flat.length ? Math.max(...flat) : 1;
  // Sequential: one hue, darker = higher. Opacity 0.08 (lowest) to 0.85 (highest).
  const alpha = (v: number) => (hi > lo ? 0.08 + (0.77 * (v - lo)) / (hi - lo) : 0.4);
  const center = ([r, c]: [number, number]) => `${c * cell + cell / 2},${r * cell + cell / 2}`;
  return (
    <div>
      <svg viewBox={`-1 -1 ${cols * cell + 2} ${rows * cell + 2}`} className="mx-auto block w-full max-w-[300px]" role="img" aria-label={gridSummary(item)}>
        {item.values.map((row, r) =>
          row.map((v, c) => (
            <g key={`${r}-${c}`}>
              <rect x={c * cell} y={r * cell} width={cell - 1} height={cell - 1} rx={2} className="fill-slate-800" />
              {v !== null && <rect x={c * cell} y={r * cell} width={cell - 1} height={cell - 1} rx={2} className="fill-cyan-500" fillOpacity={alpha(v)} />}
              {item.arrows?.[r]?.[c] && cell >= 14 && (
                <text x={c * cell + cell / 2} y={r * cell + cell / 2 + 4} textAnchor="middle" className="fill-slate-100" fontSize={Math.max(9, cell * 0.42)}>
                  {item.arrows[r][c]}
                </text>
              )}
            </g>
          )),
        )}
        {item.path && item.path.length > 1 && (
          <polyline points={item.path.map(center).join(" ")} className="fill-none stroke-violet-400" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {item.start && <circle cx={item.start[1] * cell + cell / 2} cy={item.start[0] * cell + cell / 2} r={cell * 0.22} className="fill-slate-100" />}
        {item.goal && (
          <rect
            x={item.goal[1] * cell + 2}
            y={item.goal[0] * cell + 2}
            width={cell - 5}
            height={cell - 5}
            rx={3}
            className="fill-none stroke-amber-400"
            strokeWidth={2.5}
          />
        )}
      </svg>
      <Legend
        entries={[
          { swatch: <span className="inline-block h-2.5 w-3 rounded-sm bg-gradient-to-r from-cyan-500/10 to-cyan-500/90" />, label: `value ${short(lo)} → ${short(hi)}` },
          ...(item.start ? [{ swatch: <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-100" />, label: "start" }] : []),
          ...(item.goal ? [{ swatch: <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-amber-400" />, label: "goal" }] : []),
          ...(item.path ? [{ swatch: <span className="inline-block h-0.5 w-3 bg-violet-400" />, label: "path" }] : []),
        ]}
      />
      {(item.xLabel || item.yLabel) && (
        <p className="mt-1 text-[11px] text-slate-400">
          {item.yLabel && <>rows: {item.yLabel}</>}
          {item.xLabel && item.yLabel && " · "}
          {item.xLabel && <>columns: {item.xLabel}</>}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-300" data-testid="lab-grid-summary">
        {gridSummary(item)}
      </p>
    </div>
  );
}

// ---------- scatter plots ----------

function PointsView({ item }: { item: PointsItem }) {
  const xs = item.points.map((p) => p[0]);
  const ys = item.points.map((p) => p[1]);
  const x = linear(Math.min(...xs), Math.max(...xs), PAD.l, W - PAD.r);
  const y = linear(Math.min(...ys), Math.max(...ys), H - PAD.b, PAD.t);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={pointsSummary(item)}>
        <Axes x={x} y={y} xLabel={item.xLabel} yLabel={item.yLabel} />
        {item.points.map((p, i) => {
          const cls = item.labels?.[i] ?? 1;
          const cx = x.to(p[0]);
          const cy = y.to(p[1]);
          // Shape AND colour carry the class: circle = class 1, cross = class 0.
          return cls === 1 ? (
            <circle key={i} cx={cx} cy={cy} r={3.2} className="fill-cyan-600 stroke-slate-900" strokeWidth={1} />
          ) : (
            <path key={i} d={`M ${cx - 3} ${cy - 3} l 6 6 m 0 -6 l -6 6`} className="stroke-amber-600" strokeWidth={1.8} />
          );
        })}
      </svg>
      {item.labels && (
        <Legend
          entries={[
            { swatch: <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-600" />, label: item.classes[1] },
            { swatch: <span className="font-bold text-amber-600">✕</span>, label: item.classes[0] },
          ]}
        />
      )}
      <p className="mt-1 text-xs text-slate-300" data-testid="lab-points-summary">
        {pointsSummary(item)}
      </p>
    </div>
  );
}
