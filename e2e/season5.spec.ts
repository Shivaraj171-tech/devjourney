// Season 5 ("Month Three: Byte's Bad Habits"), played in order in one context after
// seeding Seasons 1-4 as solved: a try/except bug (t01), a while-loop bug (t02), an
// unmerged review with an invented str.split option (t03), a nested-data bug where
// Byte's "fix" edits the test (t04), an incident where Byte explains the traceback
// wrongly (t05) and the finale, trimming Byte's unrequested extras (t06).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import {
  editorValue,
  readProgress,
  revealByteCard,
  runTests,
  seasonTickets,
  seedSolved,
  setEditorFile,
  solutionFile,
  ticketUrl,
  trackPageErrors,
  waitForPython,
  type TicketInfo,
} from "./helpers";
import { closeSolvedModal, playTicket } from "./play";

type ByteYaml = {
  suggestion: { file: string; replace: string; correct: boolean; why: { choices: string[]; answer: number } };
};

const earlier = [
  ...seasonTickets(),
  ...seasonTickets("s02-week-two"),
  ...seasonTickets("s03-going-live"),
  ...seasonTickets("s04-working-with-ai"),
];
const season5 = seasonTickets("s05-bytes-bad-habits");
const byteOf = (t: TicketInfo) => load(readFileSync(join(t.dir, "byte.yaml"), "utf-8")) as ByteYaml;
const byteCard = (page: Page) => page.getByTestId("byte-suggestion");

async function xpTotal(page: Page) {
  return Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
}

async function openTicket(page: Page, t: TicketInfo) {
  await seedSolved(page, [...earlier, ...season5.slice(0, season5.indexOf(t))]);
  await page.goto(ticketUrl(t.id));
  await revealByteCard(page);
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "undecided");
}

test("every Season 5 ticket can be played in the browser", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const errors = trackPageErrors(page);
  await seedSolved(page, earlier);

  expect(season5.map((t) => t.type)).toEqual(["bug", "bug", "review", "bug", "incident", "feature"]);
  await expect(page.getByTestId(`room-${season5[0].id}`)).toHaveAttribute("data-state", "open");
  for (const t of season5.slice(1)) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "locked");
  }

  for (const t of season5) {
    await test.step(`${t.id} (${t.type})`, async () => {
      await playTicket(page, t, { tryFalseAlarm: t.type === "review" });
    });
  }

  await page.goto("/");
  const all = [...earlier, ...season5];
  for (const t of all) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  }
  const xp = Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
  expect(xp).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/e2e/hq-season5-complete.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("Byte edits the test: accepting it turns nothing green, and the real fix keeps Maya's test", async ({ page }) => {
  const errors = trackPageErrors(page);
  const t = season5.find((x) => x.filesEditable.some((f) => f.startsWith("team_tests/")))!;
  const sug = byteOf(t).suggestion;
  expect(sug.correct).toBe(false);
  expect(sug.file.startsWith("team_tests/")).toBe(true);
  await openTicket(page, t);
  // The diff names the file it changes: the TEST, not the code.
  await expect(byteCard(page)).toContainText(sug.file);
  await waitForPython(page);

  // Accepting needs a reason before it can be locked in.
  await page.getByTestId("byte-accept").click();
  await expect(page.getByTestId("byte-lock")).toBeDisabled();
  await page.getByTestId(`byte-why-${sug.why.answer === 0 ? 1 : 0}`).click();
  await page.getByTestId("byte-lock").click();
  await expect.poll(() => editorValue(page, t.id, sug.file)).toContain(sug.replace);
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "pending");

  // The edited test is green on Byte's code, but the code is still wrong and the test can't catch it.
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  await expect(page.getByText(/can't catch it any more/).first()).toBeVisible();
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "waved-through");
  expect((await readProgress(page)).tickets[t.id].solved).toBe(false);

  // Fixing only the code isn't enough while the edited test is still there.
  const code = t.filesEditable.find((f) => f.startsWith("app/"))!;
  await setEditorFile(page, t.id, code, solutionFile(t, code));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");

  // Put Maya's test back as she wrote it: everything passes.
  await setEditorFile(page, t.id, sug.file, solutionFile(t, sug.file));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await closeSolvedModal(page, "PR merged!");
  expect(errors).toEqual([]);
});

test("Byte explains the traceback wrongly: the logs disagree, and rejecting with the right reason is caught", async ({ page }) => {
  const t = season5.find((x) => x.type === "incident")!;
  const sug = byteOf(t).suggestion;
  expect(sug.correct).toBe(false);
  await openTicket(page, t);
  const logs = page.getByTestId("incident-logs");
  await expect(logs).toContainText("too many values to unpack (expected 2)");
  await expect(logs).toContainText("a count isn't a number");

  const xp = await xpTotal(page);
  await page.getByTestId("byte-reject").click();
  await page.getByTestId(`byte-why-${sug.why.answer}`).click();
  await page.getByTestId("byte-lock").click();
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "caught");
  await expect(page.getByTestId("byte-outcome")).toContainText("Caught it! +15 XP");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 15} XP`);

  // Byte's "skip the bad rows" code would have skipped every row: the banner stays empty.
  await waitForPython(page);
  await setEditorFile(page, t.id, sug.file, readFileSync(join(t.dir, "starter", sug.file), "utf-8").replace(
    "    for dish, count in top_dishes(counts):\n        parts.append(f\"{dish} ({count})\")",
    sug.replace,
  ));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  await expect(page.getByText("'Top today: '").first()).toBeVisible();
});

test("the finale: Byte's trimmed version is right, and checking it pays", async ({ page }) => {
  const t = season5[season5.length - 1];
  const sug = byteOf(t).suggestion;
  expect(sug.correct).toBe(true);
  await openTicket(page, t);
  await waitForPython(page);
  await page.getByTestId("byte-accept").click();
  await page.getByTestId(`byte-why-${sug.why.answer}`).click();
  await page.getByTestId("byte-lock").click();
  await expect.poll(() => editorValue(page, t.id, sug.file)).toContain(sug.replace);
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await closeSolvedModal(page, "PR merged!");
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "trusted");
  await expect(page.getByTestId("byte-outcome")).toContainText("Trusted correctly, +15 XP");
  const p = await readProgress(page);
  expect(p.tickets[t.id].solved).toBe(true);
  expect(p.tickets[t.id].byteSuggestion).toMatchObject({ decision: "accept", correct: true, reasonCorrect: true });
});
