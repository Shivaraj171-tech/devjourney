// In-ticket adaptive help: after 3 failed runs in a row on the same failing check,
// suggest the most useful next step for THIS learner, from the run log (what the code
// did) and their habits (lib/game/profile.ts). Never a penalty, never automatic: it's
// an offer the learner can take or dismiss.
//
// Pure functions (imports with .ts so node can unit-test them).
import { entryPassed, errorKindLabel, isBoundaryCheck, type RunLogEntry } from "./runLog.ts";
import type { HabitId } from "./profile.ts";

/** Failed runs in a row (on one check) before help is offered. */
export const HELP_AFTER_FAILED_RUNS = 3;

export type HelpAction = "step-through" | "lesson" | "trace" | "hint" | "none";

export type AdaptiveHelp = {
  /** Stable id of the advice, e.g. "keyerror" (used for dismissing). */
  id: string;
  /** The check it is about (test name), or "" for a timeout. */
  check: string;
  title: string;
  body: string;
  action: HelpAction;
  /** Button text for the action. */
  actionLabel?: string;
  /** Why this help, in plain English. */
  because: string;
};

export type HelpTicket = {
  hasLesson: boolean;
  hasTrace: boolean;
  /** Hints not revealed yet (0 in the exam). */
  hintsLeft: number;
  /** Check names that test an edge case (optional, isBoundaryCheck is the fallback). */
  boundaryChecks?: string[];
};

/** The check that failed in each of the last `n` runs (null if none / not enough failed runs). */
export function stuckCheck(log: RunLogEntry[], n = HELP_AFTER_FAILED_RUNS): { check: string; runs: RunLogEntry[] } | null {
  if (log.length < n) return null;
  const runs = log.slice(-n);
  if (runs.some(entryPassed)) return null;
  if (runs.every((e) => e.errors.includes("Timeout"))) return { check: "", runs };
  const shared = runs[runs.length - 1].failing.filter((name) => runs.every((e) => e.failing.includes(name)));
  if (shared.length === 0) return null;
  return { check: shared[0], runs };
}

const label = (check: string) => check.replace(/^test_/, "").replace(/_/g, " ");

/**
 * The most useful next help, or null when the learner isn't stuck. Order:
 *   1. the last runs used the same code: change one thing, then run;
 *   2. the code doesn't load (SyntaxError / IndentationError / NameError on import): look at the pinned line;
 *   3. the error kind of the stuck check (KeyError, None, IndexError, TypeError, timeout...);
 *   4. a failing edge-case check: the trace table, else the lesson;
 *   5. a wrong answer: Step through, or a hint for learners who already use the debugger.
 * Habits tune the wording and the choice (e.g. "leans on hints" -> Step through first).
 */
export function adaptiveHelp(log: RunLogEntry[], ticket: HelpTicket, habits: HabitId[] = []): AdaptiveHelp | null {
  const stuck = stuckCheck(log);
  if (!stuck) return null;
  const { check, runs } = stuck;
  const last = runs[runs.length - 1];
  const n = runs.length;
  const name = check ? `“${label(check)}”` : "";

  // 1. Re-running the same code.
  const unchanged = runs.slice(1).filter((e) => !e.changed).length;
  if (unchanged >= n - 1) {
    return {
      id: "change-one-thing",
      check,
      title: "Change one thing, then run",
      body: "The last runs used exactly the same code, so they can't tell you anything new. Pick one line, change it, and run again to see what that change did.",
      action: "none",
      because: `Your last ${n} runs used the same code.`,
    };
  }

  const kinds = last.errors.filter((k) => k !== "AssertionFail");
  const kind = kinds[0];
  const pointer = habits.includes("skims-errors") ? " Start at the pinned line under the check: that's where Python stopped." : "";
  const because = (what: string) => `${n} runs in a row, ${name ? `${name} ` : ""}${what}.`;

  // 2. Code that doesn't load.
  if (kind === "SyntaxError" || kind === "IndentationError" || (check === "(import)" && kind !== "NameError")) {
    return {
      id: "syntax",
      check,
      title: "Look at the pinned line and the one above it",
      body: "Python couldn't read the file. Check the marked line and the line just above it: a missing colon at the end of an if/for/def, a bracket or quote that isn't closed, or spaces at the start that don't line up.",
      action: "none",
      because: because(`stopped with ${errorKindLabel(kind ?? "SyntaxError", 1)}`),
    };
  }
  if (kind === "Timeout" || check === "") {
    return {
      id: "timeout",
      check,
      title: "Find the loop that never stops",
      body: "Each run was stopped for taking too long. Look at your loop: what changes each time round, and what makes it stop? If nothing changes, it runs forever.",
      action: ticket.hasTrace ? "trace" : "none",
      actionLabel: ticket.hasTrace ? "Try the trace table" : undefined,
      because: `Your last ${n} runs never finished.`,
    };
  }

  const stepThrough = (id: string, title: string, body: string, what: string): AdaptiveHelp => ({
    id,
    check,
    title,
    body: body + pointer,
    action: "step-through",
    actionLabel: "Step through this check",
    because: because(what),
  });
  switch (kind) {
    case "KeyError":
      return stepThrough(
        "keyerror",
        "Step through to see what the dictionary holds",
        "Watch the dictionary in the variables list at the line that crashes: which key does the code ask for, and is that key really there? Then decide what should happen when it isn't.",
        "still stops with a KeyError",
      );
    case "NoneAttributeError":
    case "NoneTypeError":
      return stepThrough(
        "none",
        "Step through to find where the value became None",
        "Something is None (no value) when the code uses it. Step through and watch for the variable that turns into None: that's where a check (if x is None) belongs.",
        "still hits a None",
      );
    case "IndexError":
      return stepThrough(
        "indexerror",
        "Step through and watch the index",
        "The code asks for a position the list doesn't have. Watch the index and the list's length as the loop runs: positions go from 0 to len - 1.",
        "still stops with an IndexError",
      );
    case "TypeError":
      return stepThrough(
        "typeerror",
        "Step through and check each value's type",
        "A value isn't the type the code expects (text where a number should be, or the other way round). Step through and look at the values on the crashing line.",
        "still stops with a TypeError",
      );
    case "NameError":
      return {
        id: "nameerror",
        check,
        title: "Check the spelling of the name",
        body: "Python doesn't know a name the code uses. Compare it letter by letter with where it's created (capitals count), and make sure it's created before it's used." + pointer,
        action: "none",
        because: because("still stops with a NameError"),
      };
  }
  if (kind) {
    return stepThrough("crash", "Step through to the crash", "Step through this check and stop on the line that crashes: look at every variable there." + pointer, `still crashes (${kind})`);
  }

  // 4. An edge case.
  if (ticket.boundaryChecks?.includes(check) || isBoundaryCheck(check)) {
    const action: HelpAction = ticket.hasTrace ? "trace" : ticket.hasLesson ? "lesson" : "step-through";
    return {
      id: "boundary",
      check,
      title: "Check the edge: exactly at the limit",
      body: `This check tests an edge case: an exact limit, an empty list, the first or last item. Work it out by hand for that one input, line by line, and compare with what the code does (> and >=, range ends and empty lists are the usual suspects).`,
      action,
      actionLabel: action === "trace" ? "Try the trace table" : action === "lesson" ? "Re-read the lesson" : "Step through this check",
      because: because("still fails, and it's an edge case"),
    };
  }

  // 5. A wrong answer.
  const usesDebugger = habits.includes("uses-debugger") || runs.some((e) => e.stepped);
  if (usesDebugger && ticket.hintsLeft > 0 && !habits.includes("leans-on-hints")) {
    return {
      id: "hint",
      check,
      title: "Time for a hint",
      body: "You've already stepped through it. The next hint points you at the part to change.",
      action: "hint",
      actionLabel: "Show the next hint",
      because: because("still gives a different answer"),
    };
  }
  return stepThrough(
    "wrong-answer",
    "Step through and compare with what you expect",
    "Before you change more code, step through this check: at each line, say what you expect the variables to be, and stop at the first one that surprises you.",
    habits.includes("leans-on-hints") ? "still gives a different answer (Step through often shows what a hint would)" : "still gives a different answer",
  );
}

/** One line for Byte's card when the learner tends to accept Byte's code without checking. */
export const BYTE_TRUST_NUDGE = "Last few times Byte's code went through unchecked — try one example first.";
