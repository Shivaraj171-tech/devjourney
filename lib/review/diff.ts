// Which lines of a file are new in a pull request? A tiny line diff
// (longest common subsequence), fine for the small files in our tickets.

/** 1-based line numbers in `after` that are not in `before` (added or changed lines). */
export function changedLines(before: string | undefined, after: string): Set<number> {
  const b = before === undefined ? [] : before.split("\n");
  const a = after.split("\n");
  // lcs[i][j] = length of the longest common subsequence of b[i..] and a[j..]
  const lcs: number[][] = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = b.length - 1; i >= 0; i--) {
    for (let j = a.length - 1; j >= 0; j--) {
      lcs[i][j] = b[i] === a[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const changed = new Set<number>();
  let i = 0;
  let j = 0;
  while (j < a.length) {
    if (i < b.length && b[i] === a[j]) {
      i++;
      j++;
    } else if (i < b.length && lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++; // line removed from `before`
    } else {
      changed.add(j + 1);
      j++;
    }
  }
  return changed;
}

/**
 * Lines of `before` that were deleted in `after`, grouped by where they used to be:
 * key = 1-based line number in `after` that now follows them (after.length + 1 = at the end).
 */
export function removedLines(before: string | undefined, after: string): Map<number, string[]> {
  const removed = new Map<number, string[]>();
  if (before === undefined) return removed;
  const b = before.split("\n");
  const a = after.split("\n");
  const lcs: number[][] = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = b.length - 1; i >= 0; i--) {
    for (let j = a.length - 1; j >= 0; j--) {
      lcs[i][j] = b[i] === a[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < b.length) {
    if (j < a.length && b[i] === a[j]) {
      i++;
      j++;
    } else if (j >= a.length || lcs[i + 1][j] >= lcs[i][j + 1]) {
      const at = j + 1;
      removed.set(at, [...(removed.get(at) ?? []), b[i]]);
      i++;
    } else {
      j++;
    }
  }
  return removed;
}
