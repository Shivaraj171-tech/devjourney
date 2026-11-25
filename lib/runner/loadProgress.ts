// What to show while Python loads, from the worker's real stages (lib/runner/client.ts).
// Pure, so it is unit-tested. The percentage is by stage and finished file, not by byte:
// Pyodide's loader reports no byte progress, and inventing one would be dishonest.
import type { LoadProgress } from "./client";

export type LoadingView = { label: string; detail: string; percent: number; step: number; steps: number };

export function loadingView(p: LoadProgress | null): LoadingView {
  const steps = 3;
  if (!p || p.stage === "waiting") {
    return { label: "Getting Python ready", detail: "Python runs inside your browser, so nothing is installed.", percent: 4, step: 1, steps };
  }
  if (p.stage === "download") {
    const total = Math.max(1, p.filesTotal);
    const done = Math.min(p.filesDone, total);
    if (done >= total) {
      return { label: "Starting Python", detail: "Downloaded. Starting the interpreter in your browser.", percent: 85, step: 2, steps };
    }
    return {
      label: `Downloading Python (${done} of ${total} files)`,
      detail: "About 6 MB the first time, then it is saved on this device and starts in a couple of seconds.",
      percent: Math.round(8 + (72 * done) / total),
      step: 1,
      steps,
    };
  }
  return { label: "Loading the checks", detail: "Almost ready.", percent: 95, step: 3, steps };
}
