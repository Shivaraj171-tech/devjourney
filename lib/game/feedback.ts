// Encouraging, honest one-liners for a test run that didn't fully pass.
// Pure function so it's easy to test.

/**
 * @param passed checks passing on this run
 * @param total the ticket's real number of checks (not the number of results: when the code
 *   fails to load, the runner reports one synthetic "(import)" failure instead of every check)
 * @param previousPassed checks passing on the run before, if any
 * @param loadFailed the learner's code could not be imported, so no check ran at all
 */
export function runEncouragement(passed: number, total: number, previousPassed?: number, loadFailed = false): string {
  if (loadFailed) return "Your code didn't load, so none of the checks could run yet. Fix the error below first, then run again.";
  if (total === 0 || passed >= total) return "";
  const left = total - passed;
  const progress =
    previousPassed !== undefined && passed > previousPassed
      ? `Progress: ${passed - previousPassed} more passing than your last run. `
      : previousPassed !== undefined && passed < previousPassed
        ? "Careful: fewer checks pass than last time, so your last change broke something. "
        : "";
  // "None pass" comes before "one to go": with a single check, 0 of 1 is not "so close".
  if (passed === 0) return `${progress}No checks pass yet. Start with the first one: what did it expect, and what did your code give?`;
  if (left === 1) return `${progress}So close: one check to go. Read its message below.`;
  return `${progress}${left} checks to go. Fix them one at a time, starting from the top.`;
}
