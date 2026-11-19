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
};
