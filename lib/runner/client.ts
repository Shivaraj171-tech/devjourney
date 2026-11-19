"use client";

import type { RunResult } from "./types";

const TIMEOUT_MS = 8000;

type Pending = { resolve: (r: RunResult) => void; timer: ReturnType<typeof setTimeout> };

/**
 * Owns the Pyodide web worker. One instance per page.
 * - `warmUp()` starts loading Python in the background (takes a few seconds).
 * - `run()` runs the tests; if they take longer than TIMEOUT_MS (e.g. an
 *   infinite loop) the worker is killed and a fresh one is started.
 */
export class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  warmUp(): Promise<void> {
    if (this.ready) return this.ready;
    const worker = new Worker("/runner-worker.js", { type: "module" });
    this.worker = worker;
    this.ready = new Promise((resolve, reject) => {
      worker.onmessage = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.type === "ready") resolve();
        else if (msg.type === "result") this.finish(msg.id, msg.result);
        else if (msg.type === "error") {
          if (msg.id == null) reject(new Error(msg.message));
          else this.finish(msg.id, { passed: false, results: [], error: msg.message });
        }
      };
      worker.onerror = (event) => reject(new Error(event.message || "worker failed to start"));
    });
    return this.ready;
  }

  async run(files: Record<string, string>, tests: Record<string, string>): Promise<RunResult> {
    try {
      await this.warmUp();
    } catch (err) {
      this.reset();
      return { passed: false, results: [], error: String(err) };
    }
    const id = this.nextId++;
    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.reset();
        resolve({
          passed: false,
          results: [],
          error: `Your code took longer than ${TIMEOUT_MS / 1000} seconds. Is there a loop that never ends?`,
        });
      }, TIMEOUT_MS);
      this.pending.set(id, { resolve, timer });
      this.worker!.postMessage({ type: "run", id, files, tests });
    });
  }

  private finish(id: number, result: RunResult) {
    const p = this.pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(id);
    p.resolve(result);
  }

  /** Kill the worker; the next run() starts a fresh one. */
  reset() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ passed: false, results: [], error: "Python was restarted." });
    }
    this.pending.clear();
  }

  dispose() {
    this.reset();
  }
}
