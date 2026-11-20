// Encouraging, honest one-liners for a test run that didn't fully pass.
// Pure function so it's easy to test.

export function runEncouragement(passed: number, total: number, previousPassed?: number): string {
  if (total === 0 || passed >= total) return "";
  const left = total - passed;
  const progress =
    previousPassed !== undefined && passed > previousPassed
      ? `Progress: ${passed - previousPassed} more passing than your last run. `
      : previousPassed !== undefined && passed < previousPassed
        ? "Careful: fewer checks pass than last time, so your last change broke something. "
        : "";
  if (left === 1) return `${progress}So close: one check to go. Read its message below.`;
  if (passed === 0) return `${progress}No checks pass yet. Start with the first one: what did it expect, and what did your code give?`;
  return `${progress}${left} checks to go. Fix them one at a time, starting from the top.`;
}
