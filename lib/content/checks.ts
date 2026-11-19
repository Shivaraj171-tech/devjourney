// Lists a ticket's checks (test function names) so the task box can show an
// acceptance checklist, e.g. "test_exactly_25_dollars_is_free" -> "exactly 25 dollars is free".

export type Check = { file: string; name: string; label: string };

export function testLabel(name: string): string {
  return name.replace(/^test_/, "").replace(/_/g, " ");
}

export function listChecks(tests: Record<string, string>): Check[] {
  const checks: Check[] = [];
  for (const [file, source] of Object.entries(tests)) {
    for (const m of source.matchAll(/^def (test_\w+)\s*\(/gm)) {
      checks.push({ file, name: m[1], label: testLabel(m[1]) });
    }
  }
  return checks;
}
