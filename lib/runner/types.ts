import type { VizItem } from "../lab/viz";

/** One test's outcome, as produced by lib/runner/test_runner.py. */
export type TestResult = {
  file: string;
  name: string;
  status: "pass" | "fail" | "error";
  message: string;
  traceback: string;
  output: string;
};

export type RunResult = {
  passed: boolean;
  results: TestResult[];
  /** Set when the run itself failed (timeout, Python failed to load...). */
  error?: string;
  /** What the tests drew with `from lab import viz` (Robotics Lab), cleaned by parseViz. Absent if nothing. */
  viz?: VizItem[];
};

/** One recorded step of a traced check, as produced by lib/runner/tracer.py. */
export type TraceStep = {
  /** Learner file, relative to the code folder (e.g. "app/cart.py"). */
  file: string;
  line: number;
  /** Function the step is in. */
  func: string;
  /** Identifies one call of a function (a recursive function has several). */
  frame: number;
  /**
   * "call": the function was just called. "line": this line is about to run.
   * "return": the function returns `value`. "exception": `exception` happened
   * here. "unwind": the function is left early because of an exception.
   */
  event: "call" | "line" | "return" | "exception" | "unwind";
  /** [name, short repr] pairs, in the order the variables were created. */
  locals: [string, string][];
  /** Everything printed so far. */
  stdout: string;
  /** Function names from the check down to this one (outermost first). */
  stack: string[];
  value?: string;
  exception?: string;
  /** For "exception": true where it was raised, false where it passes through. */
  raised_here?: boolean;
};

/** One check run step by step, as produced by lib/runner/tracer.py. */
export type TraceResult = {
  file: string;
  name: string;
  /** "stopped" means the step limit was hit (probably a loop that never ends). */
  status: TestResult["status"] | "stopped";
  message: string;
  traceback: string;
  output: string;
  steps: TraceStep[];
  truncated: boolean;
};

/** What PythonRunner.trace() resolves to: a trace, or why there is none. */
export type TraceOutcome = { trace: TraceResult; error?: undefined } | { trace?: undefined; error: string };
