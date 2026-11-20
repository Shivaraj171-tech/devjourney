"use client";
// HQ: while the learner looks around, quietly fetch the big Pyodide files so the
// next ticket's "Run tests" is ready sooner. Runs when the browser is idle, and
// never with Data Saver on or on a 2G connection. The files land in the HTTP
// cache, and in the service worker's cache when one controls the page.
import { useEffect } from "react";
import { withBase } from "@/lib/basePath";
import { whenServiceWorkerControls } from "@/lib/serviceWorker";

const FILES = ["/pyodide/pyodide.asm.wasm", "/pyodide/python_stdlib.zip", "/pyodide/pyodide.asm.mjs", "/pyodide/pyodide.mjs", "/pyodide/pyodide-lock.json"];

type Connection = { saveData?: boolean; effectiveType?: string };

/** False when the learner asked to save data, or the connection is too slow to spare ~13 MB. */
export function shouldPrefetchPython(connection: Connection | undefined): boolean {
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}

/** True once this browser has real progress (onboarded or any ticket touched). */
function hasStartedLearning(): boolean {
  try {
    const raw = window.localStorage.getItem("devjourney:progress:v1");
    if (!raw) return false;
    const p = JSON.parse(raw) as { onboarded?: boolean; tickets?: Record<string, unknown> };
    return Boolean(p.onboarded) || Object.keys(p.tickets ?? {}).length > 0;
  } catch {
    return false;
  }
}

export default function PythonPrefetch() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // keep `next dev` quiet
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (!shouldPrefetchPython(connection)) return;
    // Only for learners who've started (finished onboarding or touched a ticket):
    // first-time visitors who are just browsing shouldn't pay ~13 MB of data.
    if (!hasStartedLearning()) return;
    let cancelled = false;
    const prefetch = async () => {
      // Let the service worker take over first, so the files are kept for offline use too.
      await whenServiceWorkerControls(3000);
      if (cancelled) return;
      for (const file of FILES) {
        const href = withBase(file);
        if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) continue;
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        document.head.appendChild(link);
      }
    };
    // Safari has no requestIdleCallback: fall back to a short delay after load.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const run = () => void prefetch();
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 5000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(run, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);
  return null;
}
