// Season 4 ("Month Two: Working with Byte"), played in order in one context after
// seeding Seasons 1-3 as solved. Includes a read ticket, a ticket where the learner
// writes tests against Byte's attempts (t02), an unmerged review with a
// hallucinated API (t03), a regression bug (t04) and the finale (t05).
import { expect, test } from "@playwright/test";
import { allSeasonTickets, readProgress, runTests, seasonTickets, seedSolved, setEditorFile, solutionFile, ticketUrl, trackPageErrors, waitForPython } from "./helpers";
import { playTicket } from "./play";

const earlier = [...seasonTickets(), ...seasonTickets("s02-week-two"), ...seasonTickets("s03-going-live")];
const season4 = seasonTickets("s04-working-with-ai");

test("every Season 4 ticket can be played in the browser", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const errors = trackPageErrors(page);
  await seedSolved(page, earlier);

  expect(season4.map((t) => t.type)).toEqual(["read", "feature", "review", "bug", "feature"]);
  await expect(page.getByTestId(`room-${season4[0].id}`)).toHaveAttribute("data-state", "open");
  for (const t of season4.slice(1)) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "locked");
  }

  for (const t of season4) {
    await test.step(`${t.id} (${t.type})`, async () => {
      await playTicket(page, t, { tryFalseAlarm: t.type === "review" });
    });
  }

  await page.goto("/");
  const all = [...earlier, ...season4];
  expect(all.length).toBe(26);
  await expect(page.locator("[data-testid^=room-]")).toHaveCount(allSeasonTickets().length);
  for (const t of all) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  }
  const xp = Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
  expect(xp).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/e2e/hq-season4-complete.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("testing Byte's vouchers: tests copied from Byte's first attempt aren't enough", async ({ page }) => {
  const t = season4.find((x) => x.filesEditable.some((f) => f.startsWith("team_tests/")))!;
  await seedSolved(page, [...earlier, ...season4.slice(0, season4.indexOf(t))]);
  await page.goto(ticketUrl(t.id));
  await waitForPython(page);
  const file = t.filesEditable[0];
  const header = "from app.vouchers import late_voucher\n\n\n";

  // Tests that only check far from the edges pass, but miss Byte's >= slips.
  await setEditorFile(
    page, t.id, file,
    header +
      "def test_a():\n    assert late_voucher(10) == 0\n\n\n" +
      "def test_b():\n    assert late_voucher(50) == 300\n\n\n" +
      "def test_c():\n    assert late_voucher(90) == 500\n",
  );
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");

  // Expectations copied from Byte's first attempt (45 gets a voucher) fail on the real code.
  await setEditorFile(
    page, t.id, file,
    header +
      "def test_a():\n    assert late_voucher(45) == 300\n\n\n" +
      "def test_b():\n    assert late_voucher(60) == 300\n\n\n" +
      "def test_c():\n    assert late_voucher(61) == 500\n",
  );
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  expect((await readProgress(page)).tickets[t.id].solved).toBe(false);

  await setEditorFile(page, t.id, file, solutionFile(t, file));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await expect(page.getByTestId("solved-modal")).toBeVisible();
});
