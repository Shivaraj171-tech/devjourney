// Plays the whole of Season 1 in one browser context, exactly like a learner:
// starter fails in Pyodide, the reference solution passes, the quiz is answered.
import { expect, test } from "@playwright/test";
import {
  answerQuiz,
  openQuizTab,
  readProgress,
  runTests,
  seasonTickets,
  setEditorFile,
  solutionFile,
  ticketUrl,
  trackPageErrors,
  waitForPython,
} from "./helpers";

const tickets = seasonTickets();

test("every Season 1 ticket can be solved in the browser", async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const errors = trackPageErrors(page);

  for (const t of tickets) {
    await test.step(`${t.id} (${t.type})`, async () => {
      await page.goto(ticketUrl(t.id));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/still in the backlog/)).toHaveCount(0);

      if (t.type === "read") {
        await expect(page.getByTestId("run-tests")).toHaveCount(0);
        await openQuizTab(page);
        await answerQuiz(page, t.questions);
        const modal = page.getByTestId("solved-modal");
        await expect(modal).toBeVisible();
        await expect(modal).toContainText("Ticket closed!");
        await modal.getByRole("button", { name: "Stay here" }).click();
        await expect(modal).toHaveCount(0);
        await expect(page.getByTestId("quiz-done")).toBeVisible();
      } else {
        await waitForPython(page);

        // 1. The starter code must fail.
        await runTests(page);
        await expect(page.getByTestId("run-error")).toHaveCount(0);
        await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
        await expect(page.getByTestId("solved-modal")).toHaveCount(0);

        // 2. Paste the reference solution into every editable file.
        for (const path of t.filesEditable) {
          await setEditorFile(page, t.id, path, solutionFile(t, path));
        }
        await runTests(page);
        await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
        const modal = page.getByTestId("solved-modal");
        await expect(modal).toBeVisible();
        await expect(modal).toContainText("PR merged!");
        await modal.getByRole("button", { name: "Stay here" }).click();
        await expect(modal).toHaveCount(0);

        // 3. Quiz.
        if (t.questions.length > 0) {
          await openQuizTab(page);
          await answerQuiz(page, t.questions);
          await expect(page.getByTestId("quiz-done")).toContainText(`${t.questions.length}/${t.questions.length}`);
        }
      }

      const p = await readProgress(page);
      expect(p.tickets[t.id].solved, `${t.id} solved`).toBe(true);
      if (t.questions.length > 0) expect(p.tickets[t.id].quizDone, `${t.id} quiz done`).toBe(true);
    });
  }

  await page.goto("/");
  for (const t of tickets) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  }
  await expect(page.getByText("Season complete!")).toBeVisible();
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  await expect(page.getByText(`${tickets.length}/${tickets.length} features shipped`)).toBeVisible();
  const xpText = await page.getByTestId("xp-total").textContent();
  expect(Number(xpText?.replace(/\D/g, ""))).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/e2e/hq-season-complete.png", fullPage: true });
  expect(errors).toEqual([]);
});
