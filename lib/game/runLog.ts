// What the learner's CODE did, run by run: a small, privacy-safe log per ticket.
//
// Each "Run tests" adds one entry: when, how many checks passed, which checks
// failed (test names), what kind of error each failure was (the exception type
// from the runner's message, never the message text), whether the code changed
// since the last run (compared by a hash, the code itself is never stored),
// whether Step through was used since the last run, and where the first error
// pointed (file, line and a hash of that line, so the next run can tell whether
// the learner edited the reported line). Capped at RUN_LOG_CAP entries per ticket.
//
// Pure functions, no runtime imports, so node can unit-test them.

export const RUN_LOG_CAP = 20;
/** At most this many failing check names per entry. */
const MAX_FAILING = 8;

/**
 * The kind of a failure. Exception names come from the runner ("KeyError: 'x'" ->
 * "KeyError"); a few get a sharper kind:
 *   "NoneAttributeError"  AttributeError: 'NoneType' object has no attribute ...
 *   "NoneTypeError"       TypeError: ... 'NoneType' ...
 *   "AssertionFail"       a check's assert failed (the code ran, the answer was wrong)
 *   "Timeout"             the run was stopped (probably a loop that never ends)
 */
export type ErrorKind = string;

export type RunLogEntry = {
  /** Epoch milliseconds. */
  at: number;
  passed: number;
  total: number;
  /** Names of the failing checks, e.g. "test_exactly_25_dollars_is_free" ("(import)" when the code didn't load). */
  failing: string[];
  /** Distinct error kinds in this run (see ErrorKind). */
  errors: ErrorKind[];
  /** True when the code differs from the previous run's (always true on the first run). */
  changed: boolean;
  /** Short hash of the learner's code (never the code itself). */
  hash: string;
  /** Step through was used since the previous run. */
  stepped?: boolean;
  /** Where the first crash pointed: file, line, and a hash of that line's text. */
  errLine?: { file: string; line: number; hash: string };
  /** The previous run pointed at a line (errLine): was that line edited before this run? */
  editedErrLine?: boolean;
};

/** The minimal shape of a runner result this module reads (lib/runner/types.ts RunResult). */
export type RunLike = {
  passed: boolean;
  error?: string;
  results: { file: string; name: string; status: "pass" | "fail" | "error"; message: string; traceback: string }[];
};

// ---------- hashing (FNV-1a, 32 bit) ----------

export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** One hash for a set of files (path order doesn't matter). */
export function codeHash(files: Record<string, string>): string {
  return hashText(
    Object.keys(files)
      .sort()
      .map((p) => `${p}\u0000${files[p]}`)
      .join("\u0001"),
  );
}

/** Hash of one line (1-based) of a text, trailing spaces ignored; null if there is no such line. */
export function lineHash(text: string | undefined, line: number): string | null {
  if (text === undefined || line < 1) return null;
  const lines = text.split("\n");
  if (line > lines.length) return null;
  return hashText(lines[line - 1].replace(/\s+$/, ""));
}

// ---------- classifying failures ----------

/** The error kind of one failing check, or null for a pass. */
export function errorKind(r: { status: string; message: string }): ErrorKind | null {
  if (r.status === "pass") return null;
  if (r.status === "fail") return "AssertionFail";
  const name = /^([A-Za-z_][A-Za-z0-9_]{0,40})\b/.exec(r.message ?? "")?.[1];
  if (!name) return "OtherError";
  if (name === "AttributeError" && /'NoneType'/.test(r.message)) return "NoneAttributeError";
  if (name === "TypeError" && /'NoneType'/.test(r.message)) return "NoneTypeError";
  if (name === "ModuleNotFoundError") return "ImportError";
  return name;
}

/** Plain-English name of an error kind ("KeyError", "a check that failed", ...). */
export function errorKindLabel(kind: ErrorKind, count = 1): string {
  const plural = count === 1 ? "" : "s";
  switch (kind) {
    case "AssertionFail":
      return `wrong answer${plural}`;
    case "Timeout":
      return `run${plural} that never finished`;
    case "NoneAttributeError":
      return `None error${plural} (AttributeError on None)`;
    case "NoneTypeError":
      return `None error${plural} (TypeError on None)`;
    case "OtherError":
      return `crash${plural}`;
    default:
      return `${kind}${plural}`;
  }
}

/**
 * Check names that test a boundary or an edge case: an exact limit, an empty
 * input, the first or last item... A failing one is an "off-by-one-style" miss.
 */
const BOUNDARY = /(^|_)(exactly|empty|zero|last|first|just_under|just_over|under|edge|boundary|limit|max|min|single|nothing|no_\w+|one|at_least|at_most)(_|$)/;
export function isBoundaryCheck(name: string): boolean {
  return BOUNDARY.test(name.replace(/^test_/, ""));
}

/** Where learner code lives inside the sandbox (same as lib/runner/explain.ts). */
const CODE_ROOT = "/workspace/code/";

/** The learner-code file and line the traceback points to last (same rule as explain.ts findLocation). */
export function tracebackLocation(traceback: string): { file: string; line: number } | null {
  const pattern = /File "([^"]+)", line (\d+)/g;
  let found: { file: string; line: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(traceback ?? ""))) {
    const idx = m[1].indexOf(CODE_ROOT);
    if (idx !== -1) found = { file: m[1].slice(idx + CODE_ROOT.length), line: Number(m[2]) };
  }
  return found;
}

/** A run stopped for taking too long (lib/runner/client.ts timeoutMessage). */
export function isTimeout(error: string | undefined): boolean {
  return !!error && /took longer than/i.test(error);
}

// ---------- building the log ----------

/**
 * The log entry for one run, or null when the run says nothing about the code
 * (Python failed to load or was restarted). `files` is the learner's code as run
 * (starter + edits), `totalChecks` the ticket's number of checks.
 */
export function runEntry(args: {
  prev: RunLogEntry | undefined;
  result: RunLike;
  files: Record<string, string>;
  totalChecks: number;
  stepped: boolean;
  now: number;
}): RunLogEntry | null {
  const { prev, result, files, totalChecks, stepped, now } = args;
  const hash = codeHash(files);
  const edited = prev ? editedReportedLine(prev, files) : null;
  const base = {
    at: now,
    hash,
    changed: !prev || prev.hash !== hash,
    ...(stepped ? { stepped: true } : {}),
    ...(edited !== null ? { editedErrLine: edited } : {}),
  };
  if (result.error) {
    if (!isTimeout(result.error)) return null;
    return { ...base, passed: 0, total: totalChecks, failing: [], errors: ["Timeout"] };
  }
  const failingResults = result.results.filter((r) => r.status !== "pass");
  const errors = [...new Set(failingResults.map((r) => errorKind(r)).filter((k): k is string => !!k))];
  const passed = result.results.length - failingResults.length;
  const entry: RunLogEntry = {
    ...base,
    passed,
    total: Math.max(totalChecks, result.results.length),
    failing: failingResults.map((r) => r.name).slice(0, MAX_FAILING),
    errors,
  };
  const firstCrash = failingResults.find((r) => r.status === "error");
  const loc = firstCrash ? tracebackLocation(firstCrash.traceback) : null;
  const h = loc ? lineHash(files[loc.file], loc.line) : null;
  if (loc && h) entry.errLine = { file: loc.file, line: loc.line, hash: h };
  return entry;
}

/** Add an entry, keeping the newest RUN_LOG_CAP. */
export function appendRun(log: RunLogEntry[] | undefined, entry: RunLogEntry, cap = RUN_LOG_CAP): RunLogEntry[] {
  return [...(log ?? []), entry].slice(-cap);
}

/** All checks green. */
export function entryPassed(e: RunLogEntry): boolean {
  return e.failing.length === 0 && e.errors.length === 0 && e.total > 0 && e.passed >= e.total;
}

/**
 * Did the learner edit the line the previous run's error pointed at? `files` is the
 * code of the run after it. null when there was no reported line.
 */
export function editedReportedLine(prev: RunLogEntry, files: Record<string, string>): boolean | null {
  if (!prev.errLine) return null;
  const now = lineHash(files[prev.errLine.file], prev.errLine.line);
  return now !== prev.errLine.hash;
}

/** Keep only well-formed entries (old saves, hand-edited storage, restored backups). */
export function cleanRunLog(raw: unknown): RunLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: RunLogEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    if (typeof r.at !== "number" || typeof r.passed !== "number" || typeof r.total !== "number") continue;
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    const entry: RunLogEntry = {
      at: r.at,
      passed: r.passed,
      total: r.total,
      failing: strings(r.failing),
      errors: strings(r.errors),
      changed: r.changed !== false,
      hash: typeof r.hash === "string" ? r.hash : "",
    };
    if (r.stepped === true) entry.stepped = true;
    if (typeof r.editedErrLine === "boolean") entry.editedErrLine = r.editedErrLine;
    const l = r.errLine as Record<string, unknown> | undefined;
    if (l && typeof l.file === "string" && typeof l.line === "number" && typeof l.hash === "string") {
      entry.errLine = { file: l.file, line: l.line, hash: l.hash };
    }
    out.push(entry);
  }
  return out.slice(-RUN_LOG_CAP);
}
