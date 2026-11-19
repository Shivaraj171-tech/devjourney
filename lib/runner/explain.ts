// Turns Python errors into plain-language explanations for beginners.
// Pure functions, no React, so they're easy to test.
import type { TestResult } from "./types";

export type Explanation = {
  /** One friendly sentence about what went wrong. */
  summary: string;
  /** The learner's file and line where it happened, if we can tell. */
  location: { file: string; line: number } | null;
};

/** Where learner code lives inside the Python sandbox (see public/runner-worker.js). */
const CODE_ROOT = "/workspace/code/";

/**
 * Finds the last traceback frame that points into the learner's code, e.g.
 *   File "/workspace/code/app/menu.py", line 8, in format_price
 * SyntaxErrors have no "in ..." part, so that bit is optional.
 */
export function findLocation(traceback: string): Explanation["location"] {
  const pattern = /File "([^"]+)", line (\d+)/g;
  let found: Explanation["location"] = null;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(traceback))) {
    const idx = m[1].indexOf(CODE_ROOT);
    if (idx !== -1) found = { file: m[1].slice(idx + CODE_ROOT.length), line: Number(m[2]) };
  }
  return found;
}

const EXPLAIN: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^SyntaxError: (.*)/, () => "Python couldn't read this code. Look for a missing colon, bracket or quote on (or just before) the marked line."],
  [/^IndentationError: (.*)/, () => "The spaces at the start of a line don't line up. Python uses indentation to know which lines belong together."],
  [/^NameError: name '(\w+)' is not defined/, (m) => `Python doesn't know anything called \`${m[1]}\`. Is it misspelled, or used before it's created?`],
  [/^AttributeError: 'NoneType' object has no attribute '(\w+)'/, (m) => `Something was \`None\` (no value), and you can't call \`.${m[1]}\` on nothing. Check for None before using it.`],
  [/^AttributeError: '(\w+)' object has no attribute '(\w+)'/, (m) => `A ${m[1]} doesn't have \`.${m[2]}\`. Check the spelling, or whether the value is the type you expect.`],
  [/^TypeError: unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/, (m) => `You tried to use \`${m[1]}\` on a ${m[2]} and a ${m[3]}, which Python can't combine. Convert one of them first.`],
  [/^TypeError: can only concatenate str/, () => "You tried to join text with something that isn't text. Use an f-string or str() to turn it into text first."],
  [/^TypeError: (\w+)\(\) missing (\d+) required positional argument/, (m) => `\`${m[1]}()\` was called without all the values it needs (${m[2]} missing).`],
  [/^TypeError: (.*)/, () => "A value is the wrong type for what the code does with it (for example, text where a number is expected)."],
  [/^KeyError: (.*)/, (m) => `The dictionary has no key ${m[1]}. Check it exists first (with \`in\` or \`.get()\`).`],
  [/^IndexError: (.*)/, () => "The code asked for a position that doesn't exist in the list. Remember lists start at 0 and end at len - 1."],
  [/^ZeroDivisionError/, () => "The code divided by zero. What should happen when there's nothing to divide by?"],
  [/^ValueError: (.*)/, () => "A value has the right type but a bad content (for example, int('abc'))."],
  [/^SystemExit/, () => "The code called exit(), which stops the whole program. Return a value from the function instead."],
  [/^RecursionError/, () => "A function kept calling itself and never stopped."],
  [/^ImportError|^ModuleNotFoundError/, () => "Python couldn't find a file or function being imported. Check the names match exactly."],
];

export function explainResult(r: TestResult): Explanation | null {
  if (r.status === "pass") return null;
  const location = findLocation(r.traceback);
  if (r.status === "fail") {
    return { summary: "The code ran, but gave a different answer than expected.", location };
  }
  for (const [pattern, explain] of EXPLAIN) {
    const m = r.message.match(pattern);
    if (m) return { summary: explain(m), location };
  }
  return { summary: "The code crashed while running this check.", location };
}
