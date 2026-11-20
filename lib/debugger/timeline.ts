// Pure helpers for the step-through debugger: which variables changed, and a
// plain-English caption for each step. Everything here is derived only from
// the recorded steps (no guessing), so captions stay truthful.
import type { TraceResult, TraceStep } from "../runner/types";

export type VarChange = "new" | "changed";

/** Index of the closest earlier step in the same function call, or -1. */
export function previousInFrame(steps: TraceStep[], index: number): number {
  const frame = steps[index]?.frame;
  for (let i = index - 1; i >= 0; i--) {
    if (steps[i].frame === frame) return i;
  }
  return -1;
}

/**
 * Variables that are new or have a different value than at the previous step
 * of the same function call. At the first step of a call, every variable is new.
 */
export function diffLocals(steps: TraceStep[], index: number): Map<string, VarChange> {
  const changes = new Map<string, VarChange>();
  const step = steps[index];
  if (!step) return changes;
  const prevIndex = previousInFrame(steps, index);
  const before = new Map(prevIndex === -1 ? [] : steps[prevIndex].locals);
  for (const [name, value] of step.locals) {
    if (!before.has(name)) changes.set(name, "new");
    else if (before.get(name) !== value) changes.set(name, "changed");
  }
  return changes;
}

/** "KeyError: 'pizza'" -> { name: "KeyError", detail: "'pizza'" } */
export function splitException(text: string): { name: string; detail: string } {
  const i = text.indexOf(": ");
  return i === -1 ? { name: text, detail: "" } : { name: text.slice(0, i), detail: text.slice(i + 2) };
}

const MAX_CHANGES_IN_CAPTION = 3;

/** "i is now 2, total is set to 0" for the variables that changed at this step. */
export function describeChanges(step: TraceStep, changes: Map<string, VarChange>): string {
  const values = new Map(step.locals);
  const parts: string[] = [];
  for (const [name, kind] of changes) {
    parts.push(kind === "new" ? `${name} is set to ${values.get(name)}` : `${name} is now ${values.get(name)}`);
  }
  if (parts.length > MAX_CHANGES_IN_CAPTION) {
    const more = parts.length - MAX_CHANGES_IN_CAPTION;
    return `${parts.slice(0, MAX_CHANGES_IN_CAPTION).join(", ")} and ${more} more`;
  }
  return parts.join(", ");
}

/** The exception that a frame is unwinding from: the latest "exception" step of that call. */
function exceptionInFrame(steps: TraceStep[], index: number): string | null {
  for (let i = previousInFrame(steps, index); i !== -1; i = previousInFrame(steps, i)) {
    if (steps[i].event === "exception") return steps[i].exception ?? null;
  }
  return null;
}

/** A short, plain-English sentence describing step `index`. */
export function stepCaption(steps: TraceStep[], index: number): string {
  const step = steps[index];
  if (!step) return "";
  const changes = diffLocals(steps, index);

  switch (step.event) {
    case "call": {
      const args = step.locals.map(([n, v]) => `${n} = ${v}`);
      return args.length ? `${step.func} is called with ${args.join(", ")}` : `${step.func} is called`;
    }
    case "return":
      return `${step.func} returns ${step.value ?? "None"}`;
    case "exception": {
      const { name, detail } = splitException(step.exception ?? "an error");
      if (step.raised_here) return `💥 ${name} raised here${detail ? `: ${detail}` : ""}`;
      return `💥 The ${name} reaches ${step.func} (line ${step.line})`;
    }
    case "unwind": {
      const exc = exceptionInFrame(steps, index);
      const name = exc ? splitException(exc).name : "error";
      return `${step.func} stops early because of the ${name}`;
    }
    case "line": {
      const prevIndex = previousInFrame(steps, index);
      const prev = prevIndex === -1 ? null : steps[prevIndex];
      let head = `Line ${step.line} runs next`;
      if (prev?.event === "call") head = `Line ${step.line}: ${step.func} starts here`;
      else if (prev?.event === "exception") head = `Line ${step.line}: the ${splitException(prev.exception ?? "error").name} is caught`;
      else if (prev?.event === "line" && step.line <= prev.line) head = `Line ${step.line}: back to the top of the loop`;
      const changed = describeChanges(step, changes);
      return changed ? `${head} — ${changed}` : head;
    }
  }
}

/** Caption for the last position of the timeline: how the check ended. */
export function resultCaption(trace: Pick<TraceResult, "status" | "steps" | "truncated">): string {
  switch (trace.status) {
    case "pass":
      return "✅ The check finished and passed.";
    case "fail":
      return "❌ The check finished, but the answer wasn't what it expected.";
    case "error":
      return "💥 The check crashed with an error.";
    case "stopped":
      return `⏹ Stopped after ${trace.steps.length} steps — is there a loop that never ends?`;
  }
}

/** Positions on the slider: one per step, plus one at the end for the check's result. */
export function timelineLength(trace: Pick<TraceResult, "steps">): number {
  return trace.steps.length + 1;
}

/** Turns `test_exactly_25_dollars_is_free` into "exactly 25 dollars is free". */
export function checkLabel(name: string): string {
  return name.replace(/^test_/, "").replace(/_/g, " ");
}
