// "Almost there" feedback after a run, and badge pop-ups on the HQ.
import { expect, test } from "@playwright/test";
import { seasonTickets, seedSolved, waitForPython } from "./helpers";

const [t01] = seasonTickets();

test("a failing run shows encouraging next-step feedback", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(`/ticket/${t01.id}/`);
  await waitForPython(page);
  await page.getByTestId("run-tests").click();
  await expect(page.getByTestId("run-summary")).toBeVisible();
  await expect(page.getByTestId("run-encouragement")).toContainText("No checks pass yet");
});

test("a badge earned since the last visit pops up once", async ({ page }) => {
  // First visit with nothing solved: no pop-up, and the empty badge list is remembered.
  await seedSolved(page, []);
  await expect(page.getByTestId("office-map").first()).toBeVisible();
  await expect(page.getByTestId("badge-toast")).toHaveCount(0);

  // Now a ticket is solved (as if merged on a ticket page): First Commit pops up.
  await seedSolved(page, [t01]);
  const toast = page.getByTestId("badge-toast");
  await expect(toast).toContainText("First Commit");
  await toast.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);

  // Next visit: already seen, no pop-up.
  await page.reload();
  await expect(page.getByTestId("office-map").first()).toBeVisible();
  await expect(page.getByTestId("badge-toast")).toHaveCount(0);
});
