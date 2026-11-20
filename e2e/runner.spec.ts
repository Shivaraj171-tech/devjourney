import { expect, test } from "@playwright/test";
import {
  editorValue,
  readProgress,
  runTests,
  seasonTickets,
  setEditorFile,
  solutionFile,
  ticketUrl,
  waitForPython,
} from "./helpers";

const [t01] = seasonTickets();
const file = t01.filesEditable[0];

test("revealing a hint before solving reduces the XP awarded", async ({ page }) => {
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);

  // Fail once first so the first-run bonus doesn't muddy the comparison with the 100 XP base.
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");

  // Hints live next to Run, in a popover.
  await page.getByTestId("hints-toggle").click();
  await page.getByRole("button", { name: /Reveal hint 1/ }).click();
  await expect(page.getByText("Hint 1 · Nudge")).toBeVisible();
  await expect(page.getByTestId("hints-toggle")).toContainText("Hints (1/");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("hints-popover")).toHaveCount(0);

  await setEditorFile(page, t01.id, file, solutionFile(t01, file));
  await runTests(page);
  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Hints used");
  await expect(modal).toContainText("+100"); // base
  await expect(modal).toContainText("+80 XP"); // total

  const p = await readProgress(page);
  expect(p.tickets[t01.id].hintsUsed).toBe(1);
  expect(p.tickets[t01.id].solveXp).toBe(80);
  expect(p.tickets[t01.id].solveXp).toBeLessThan(100);
});

test("an infinite loop times out and Python recovers", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);

  await setEditorFile(page, t01.id, file, "while True:\n    pass\n");
  await runTests(page);
  await expect(page.getByTestId("run-error")).toContainText("took longer than");

  // A timed-out run is not counted as a solve.
  expect((await readProgress(page)).tickets[t01.id].solved).toBe(false);

  // Worker restarted: a correct run now passes.
  await setEditorFile(page, t01.id, file, solutionFile(t01, file));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await expect(page.getByTestId("solved-modal")).toBeVisible();
});

test("progress persists across a reload", async ({ page }) => {
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  const solution = solutionFile(t01, file);
  await setEditorFile(page, t01.id, file, solution);
  await runTests(page);
  await expect(page.getByTestId("solved-modal")).toBeVisible();

  await page.reload();
  await expect(page.getByText("✔ Merged")).toBeVisible();
  await expect.poll(() => editorValue(page, t01.id, file), { timeout: 30_000 }).toBe(solution);
  await expect(page.getByRole("link", { name: /Next ticket/ })).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId(`room-${t01.id}`)).toHaveAttribute("data-state", "done");
  const t02 = seasonTickets()[1];
  await expect(page.getByTestId(`room-${t02.id}`)).toHaveAttribute("data-state", "open");
  await page.reload();
  await expect(page.getByTestId(`room-${t01.id}`)).toHaveAttribute("data-state", "done");

  // The next ticket is now unlocked.
  await page.goto(ticketUrl(t02.id));
  await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
  await waitForPython(page);
});
