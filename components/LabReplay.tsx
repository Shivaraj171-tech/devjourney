"use client";
// Play / pause / replay and a keyboard slider over an animation's frames, shared by
// the Lab viewer's planar arm (LabViewer.tsx) and its 3D frames view (Frames3DView.tsx).
// Reduced motion: no autoplay, it starts on the last frame (the result).
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const FPS = 30;

export function useReplay(frameCount: number) {
  const reduced = useReducedMotion();
  const last = Math.max(0, frameCount - 1);
  const [frame, setFrame] = useState(() => (reduced ? last : 0));
  const [playing, setPlaying] = useState(() => !reduced && last > 0);
  const startRef = useRef<{ t: number; from: number } | null>(null);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    startRef.current = null;
    const tick = (t: number) => {
      if (!startRef.current) startRef.current = { t, from: frame >= last ? 0 : frame };
      const next = Math.min(last, startRef.current.from + Math.floor(((t - startRef.current.t) / 1000) * FPS));
      setFrame(next);
      if (next >= last) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `frame` is only read when playback (re)starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, last]);

  const toggle = () => {
    if (playing) setPlaying(false);
    else {
      if (frame >= last) setFrame(0);
      setPlaying(true);
    }
  };
  const scrub = (f: number) => {
    setPlaying(false);
    setFrame(Math.max(0, Math.min(last, f)));
  };
  return { frame, last, playing, toggle, scrub };
}

export function ReplayBar({
  frame,
  last,
  playing,
  onToggle,
  onScrub,
  valueText,
}: {
  frame: number;
  last: number;
  playing: boolean;
  onToggle: () => void;
  onScrub: (frame: number) => void;
  /** What the slider announces (the frame's text summary). */
  valueText: string;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <button
        type="button"
        data-testid="lab-play"
        onClick={onToggle}
        disabled={last === 0}
        aria-label={playing ? "Pause" : frame >= last ? "Replay" : "Play"}
        className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-sm text-white hover:bg-slate-700 disabled:opacity-40"
      >
        {playing ? "⏸" : frame >= last ? "↺" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={frame}
        data-testid="lab-slider"
        aria-label="Frame"
        aria-valuetext={valueText}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="min-w-0 flex-1 accent-cyan-500"
      />
      <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums">
        {frame + 1}/{last + 1}
      </span>
    </div>
  );
}
