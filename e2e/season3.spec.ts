// Season 3 ("Month One: Going Live"), played in order in one context after
// seeding Seasons 1 and 2 as solved. Includes a ticket where the learner writes
// tests (t03), a review with also_lines (t04) and an incident (t05).
import { expect, test } from "@playwright/test";
import { allSeasonTickets, readProgress, runTests, seasonTickets, seedSolved, setEditorFile, solutionFile, ticketUrl, trackPageErrors, waitForPython } from "./helpers";
import { playTicket, reviewOf } from "./play";

const season1 = seasonTickets();
const season2 = seasonTickets("s02-week-two");
const season3 = seasonTickets("s03-going-live");

test("every Season 3 ticket can be played in the browser", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const errors = trackPageErrors(page);
  await seedSolved(page, [...season1, ...season2]);

  await expect(page.getByTestId(`room-${season3[0].id}`)).toHaveAttribute("data-state", "open");
  for (const t of season3.slice(1)) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "locked");
  }

  for (const t of season3) {
    await test.step(`${t.id} (${t.type})`, async () => {
      // On the review, flag the also_lines where an issue has them, to prove they count.
      const useAlsoLines = t.type === "review" && reviewOf(t).issues.some((i) => i.also_lines?.length);
      await playTicket(page, t, { useAlsoLines });
    });
  }

  await page.goto("/");
  const all = allSeasonTickets();
  expect(all.length).toBe(21);
  await expect(page.locator("[data-testid^=room-]")).toHaveCount(all.length);
  for (const t of all) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  }
  // Rank thresholds are being tuned, so only check XP is positive.
  const xp = Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
  expect(xp).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/e2e/hq-season3-complete.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("writing-tests ticket: a test that doesn't catch the bug isn't enough", async ({ page }) => {
  const t = season3.find((x) => x.filesEditable.some((f) => f.startsWith("team_tests/")))!;
  const prev = season3.slice(0, season3.indexOf(t));
  await seedSolved(page, [...season1, ...season2, ...prev]);
  await page.goto(ticketUrl(t.id));
  await waitForPython(page);
  const file = t.filesEditable[0];

  // A test that always passes doesn't catch broken versions of delivery_fee.
  await setEditorFile(page, t.id, file, "from app.delivery import delivery_fee\n\n\ndef test_nothing():\n    assert True\n");
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");

  // A test that asserts the wrong rule fails against the real code.
  await setEditorFile(page, t.id, file, "from app.delivery import delivery_fee\n\n\ndef test_wrong():\n    assert delivery_fee(2500) == 399\n");
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  expect((await readProgress(page)).tickets[t.id].solved).toBe(false);

  await setEditorFile(page, t.id, file, solutionFile(t, file));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await expect(page.getByTestId("solved-modal")).toBeVisible();
});
