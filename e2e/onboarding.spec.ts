import { expect, test } from "@playwright/test";
import { readProgress, runTests, seasonTickets, setEditorFile, solutionFile, ticketUrl, waitForPython } from "./helpers";

const [t01] = seasonTickets();

test("first-visit onboarding can be dismissed and stays dismissed", async ({ page }) => {
  await page.goto("/");
  const onboarding = page.getByTestId("onboarding");
  await expect(onboarding).toBeVisible();
  await expect(onboarding).toContainText("You're hired!");

  await onboarding.getByRole("button", { name: /Let's go/ }).click();
  await expect(onboarding).toHaveCount(0);
  expect((await readProgress(page)).onboarded).toBe(true);

  // HQ is usable now: the open room is clickable.
  await page.reload();
  await expect(page.getByTestId(`room-${t01.id}`)).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  await expect(page.getByTestId("app-preview")).toBeVisible();
  await page.getByTestId("continue").click();
  await expect(page).toHaveURL(new RegExp(`/ticket/${t01.id}/?$`));
});

test("'Done when' checklist ticks from the latest run and failures are explained", async ({ page }) => {
  await page.goto(ticketUrl(t01.id));
  const checklist = page.getByTestId("acceptance-checklist");
  const items = checklist.locator("li");
  await expect(items).not.toHaveCount(0);
  const count = await items.count();

  // Before any run: every check is unticked.
  await expect(checklist.getByText("⬜")).toHaveCount(count);

  // Starter: at least one check fails, and the failure has a plain-language explanation.
  await waitForPython(page);
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  await expect(checklist.getByText("⬜")).toHaveCount(0);
  await expect(checklist.getByText("❌").first()).toBeVisible();
  await expect(page.getByTestId("explanation").first()).toBeVisible();

  // Solution: every check is ticked.
  const file = t01.filesEditable[0];
  await setEditorFile(page, t01.id, file, solutionFile(t01, file));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await page.getByTestId("solved-modal").getByRole("button", { name: "Stay here" }).click();
  await expect(checklist.getByText("✅")).toHaveCount(count);
  await expect(checklist.getByText("❌")).toHaveCount(0);

  // After a reload (no run yet), a solved ticket still shows every check ticked.
  await page.reload();
  await expect(page.getByTestId("acceptance-checklist").getByText("✅")).toHaveCount(count);
});
