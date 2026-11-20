// Human-friendly names for the concept slugs in ticket.yaml (`new_concept`).
// Pure data, no imports, so node can unit-test it.

const LABELS: Record<string, string> = {
  strings: "Strings",
  numbers: "Numbers",
  conditionals: "Conditionals (if / else)",
  loops: "Loops",
  lists: "Lists",
  dictionaries: "Dictionaries",
  functions: "Functions",
  "boolean-logic": "Boolean logic (and / or / not)",
  classes: "Classes",
  json: "JSON",
  "reading-code": "Reading code",
  "mutable-shared-data": "Mutable shared data",
  "side-effects": "Side effects",
  tracebacks: "Reading tracebacks",
  "code-review": "Code review",
  "reviewing-diffs": "Reviewing diffs",
  "writing-tests": "Writing tests",
  security: "Security",
  performance: "Performance",
  refactoring: "Refactoring",
  regressions: "Regressions",
  "hallucinated-apis": "Hallucinated APIs",
  "verifying-ai-claims": "Verifying AI claims",
  "test-first-verification": "Test-first verification",
  "specs-and-context": "Specs and context",
};

/** "mutable-shared-data" → "Mutable shared data". Unknown slugs are tidied, labels pass through. */
export function conceptLabel(slug: string): string {
  if (LABELS[slug]) return LABELS[slug];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return slug;
  const words = slug.replace(/-/g, " ");
  return words[0].toUpperCase() + words.slice(1);
}
