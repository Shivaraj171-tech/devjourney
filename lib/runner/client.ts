"use client";

import { withBase } from "../basePath";
import { whenServiceWorkerControls } from "../serviceWorker";
import type { RunResult, TraceOutcome, TraceResult } from "./types";

const TIMEOUT_MS = 8000;

type Pending = {
  /** Called with the worker's answer, or with an error message (timeout, crash, restart). */
  settle: (answer: { value: unknown } | { error: string }) => void;
  timer: ReturnType<typeof setTimeout>;
};

type WorkerMessage =
  | { type: "ready" }
  | { type: "result"; id: number; result: RunResult }
  | { type: "trace"; id: number; trace: TraceResult }
  | { type: "snippet"; id: number; result: unknown }
  | { type: "error"; id: number | null; message: string };

/** First visit only: wait this long at most for the service worker, so Pyodide is cached as it downloads. */
const SW_WAIT_MS = 3000;

const timeoutMessage = `Your code took longer than ${TIMEOUT_MS / 1000} seconds. Is there a loop that never ends?`;

/**
 * Owns the Pyodide web worker. One instance per page.
 * - `warmUp()` starts loading Python in the background (takes a few seconds).
 * - `run()` runs the tests; if they take longer than TIMEOUT_MS (e.g. an
 *   infinite loop) the worker is killed and a fresh one is started.
 * - `trace()` runs ONE check step by step for the debugger (same timeout).
 * - `runSnippet()` runs a small task-format program (formats.yaml), same timeout.
 */
export class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  warmUp(): Promise<void> {
    if (this.ready) return this.ready;
    const ready: Promise<void> = whenServiceWorkerControls(SW_WAIT_MS).then(() =>
      // Reset or disposed while waiting: this warm-up was abandoned (never settles).
      this.ready === ready ? this.start() : new Promise<void>(() => {}),
    );
    this.ready = ready;
    return ready;
  }

  private start(): Promise<void> {
    const worker = new Worker(withBase("/runner-worker.js"), { type: "module" });
    this.worker = worker;
    return new Promise((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const msg = event.data;
        if (msg.type === "ready") resolve();
        else if (msg.type === "result") this.finish(msg.id, { value: msg.result });
        else if (msg.type === "trace") this.finish(msg.id, { value: msg.trace });
        else if (msg.type === "snippet") this.finish(msg.id, { value: msg.result });
        else if (msg.type === "error") {
          if (msg.id == null) reject(new Error(msg.message));
          else this.finish(msg.id, { error: msg.message });
        }
      };
      worker.onerror = (event) => reject(new Error(event.message || "worker failed to start"));
    });
  }

  async run(files: Record<string, string>, tests: Record<string, string>): Promise<RunResult> {
    const answer = await this.request({ type: "run", files, tests });
    if ("error" in answer) return { passed: false, results: [], error: answer.error };
    return answer.value as RunResult;
  }

  /** Run one check (test function `testName` in `testFile`) with tracing on. */
  async trace(
    files: Record<string, string>,
    tests: Record<string, string>,
    testFile: string,
    testName: string,
  ): Promise<TraceOutcome> {
    const answer = await this.request({ type: "trace", files, tests, testFile, testName });
    if ("error" in answer) return { error: answer.error };
    return { trace: answer.value as TraceResult };
  }

  /**
   * Run one task-format request (predict / break_it / parsons, see lib/game/formats.ts)
   * through lib/runner/formats.py. Resolves to { value } (its JSON result), or { error }
   * when Python couldn't answer (timeout, crash, failed to load).
   */
  async runSnippet<T>(request: { kind: string }): Promise<{ value: T } | { error: string }> {
    const answer = await this.request({ type: "snippet", request });
    if ("error" in answer) return { error: answer.error };
    const value = answer.value as T & { error?: string };
    if (value && typeof value === "object" && typeof value.error === "string" && value.error.startsWith("internal:")) {
      return { error: value.error };
    }
    return { value };
  }

  private async request(message: Record<string, unknown>): Promise<{ value: unknown } | { error: string }> {
    try {
      await this.warmUp();
    } catch (err) {
      this.reset();
      return { error: String(err) };
    }
    const id = this.nextId++;
    return new Promise((settle) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.reset();
        settle({ error: timeoutMessage });
      }, TIMEOUT_MS);
      this.pending.set(id, { settle, timer });
      this.worker!.postMessage({ ...message, id });
    });
  }

  private finish(id: number, answer: { value: unknown } | { error: string }) {
    const p = this.pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(id);
    p.settle(answer);
  }

  /** Kill the worker; the next run() starts a fresh one. */
  reset() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.settle({ error: "Python was restarted." });
    }
    this.pending.clear();
  }

  dispose() {
    this.reset();
  }
}
