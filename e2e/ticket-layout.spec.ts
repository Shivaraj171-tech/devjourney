// The ticket page layout: goal first, editable file first, hints next to Run,
// the phone 3-step flow (Brief / Code / Checks), the review instruction bar,
// and the solved modal behaving like a real dialog.
import { expect, test, type Page } from "@playwright/test";
import { allSeasonTickets, runTests, seedSolved, setEditorFile, solutionFile, ticketUrl, waitForPython } from "./helpers";

const all = allSeasonTickets();
const byId = (id: string) => all.find((t) => t.id === id)!;
const before = (id: string) => all.slice(0, all.findIndex((t) => t.id === id));

async function open(page: Page, id: string) {
  await seedSolved(page, before(id));
  await page.goto(ticketUrl(id));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const top = async (page: Page, testId: string) => (await page.getByTestId(testId).boundingBox())!.y;

test("the goal comes first: task and Done when above Byte's card and the folded story", async ({ page }) => {
  await open(page, "s01-t04");
  const goal = page.getByTestId("ticket-goal");
  await expect(goal).toContainText("Your task");
  await expect(goal.getByTestId("acceptance-checklist")).toBeVisible();
  await expect(goal).toBeInViewport({ ratio: 1 });
  // First visit: the story is unfolded right under the goal, and Byte waits (playtest2.spec.ts).
  await expect(page.getByTestId("ticket-story")).toHaveAttribute("data-open", "true");
  expect(await top(page, "ticket-story")).toBeLessThan(await top(page, "byte-teaser"));

  // Later visits: Byte's card under the goal, the story folded below it.
  await page.reload();
  await expect(page.getByTestId("byte-suggestion")).toBeVisible();
  expect(await top(page, "ticket-goal")).toBeLessThan(await top(page, "byte-suggestion"));
  expect(await top(page, "byte-suggestion")).toBeLessThan(await top(page, "ticket-story"));
  // Byte's buttons are on the first screen at 1440×900.
  await expect(page.getByTestId("byte-accept")).toBeInViewport();

  // The story is folded to a couple of lines until asked for.
  const story = page.getByTestId("ticket-story");
  await expect(story).toHaveAttribute("data-open", "false");
  expect((await story.boundingBox())!.height).toBeLessThan(70);
  await page.getByRole("button", { name: /Read more/ }).click();
  await expect(story).toHaveAttribute("data-open", "true");

  // No lesson or hints tabs any more; the quiz only appears after the merge.
  await expect(page.getByRole("tab", { name: /Learn|Hints|Quiz/ })).toHaveCount(0);
});

test("the editable file is first and selected; read-only files hide behind a toggle", async ({ page }) => {
  const t = byId("s02-t03"); // incident with many read-only files
  await open(page, t.id);
  const tabs = page.getByTestId("file-tab");
  await expect(tabs.first()).toHaveAttribute("data-editable", "true");
  await expect(tabs.first()).toHaveAttribute("aria-pressed", "true");
  await expect(tabs.first()).toContainText(t.filesEditable[0]);
  await expect(tabs.first()).toBeInViewport({ ratio: 1 });
  await expect(tabs).toHaveCount(t.filesEditable.length);

  const toggle = page.getByTestId("toggle-other-files");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await tabs.count()).toBeGreaterThan(t.filesEditable.length);
  await expect(tabs.first()).toHaveAttribute("data-editable", "true");
});

test("Run shows a check pill with progress since the last run; hints open next to Run", async ({ page }) => {
  const t = byId("s01-t04");
  await open(page, t.id);
  await waitForPython(page);
  const pill = page.getByTestId("check-pill");
  await expect(pill).toContainText("0/4");
  await runTests(page);
  await expect(pill).toContainText(/\d\/4/);
  await expect(page.getByTestId("check-delta")).toHaveCount(0); // first run: nothing to compare yet

  await setEditorFile(page, t.id, t.filesEditable[0], solutionFile(t, t.filesEditable[0]));
  await runTests(page);
  await expect(page.getByTestId("check-delta")).toContainText("+");
  await expect(pill).toContainText("4/4");
});

test("review tickets: an instruction bar above the code and a flag on every line", async ({ page }) => {
  const t = byId("s02-t05");
  await open(page, t.id);
  const bar = page.getByTestId("review-instructions");
  await expect(bar).toContainText("Tap a line to flag it");
  await expect(bar).toContainText(/0\/\d+ found/);
  expect(await top(page, "review-instructions")).toBeLessThan(await top(page, "pr-file"));
  // Every non-blank line shows the flag affordance before any hover.
  const lines = page.getByTestId("pr-file").locator("button[data-line]:not([disabled])");
  const n = await lines.count();
  expect(n).toBeGreaterThan(3);
  for (let i = 0; i < n; i++) await expect(lines.nth(i).locator('[data-icon="flag"]')).toHaveCount(1);
});

test("Esc closes the solved modal, and focus stays inside it while open", async ({ page }) => {
  const t = byId("s01-t01");
  await page.goto(ticketUrl(t.id));
  await waitForPython(page);
  await setEditorFile(page, t.id, t.filesEditable[0], solutionFile(t, t.filesEditable[0]));
  await runTests(page);
  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  // One primary action: the quiz. Focus starts there.
  await expect(modal.getByTestId("solved-quiz")).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(await modal.evaluate((m) => m.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  // The quiz is now a tab in the brief.
  await expect(page.getByRole("tab", { name: /Quiz/ })).toBeVisible();
});

test("the solved modal's main action opens the quiz", async ({ page }) => {
  const t = byId("s01-t01");
  await page.goto(ticketUrl(t.id));
  await waitForPython(page);
  await setEditorFile(page, t.id, t.filesEditable[0], solutionFile(t, t.filesEditable[0]));
  await runTests(page);
  await page.getByTestId("solved-quiz").click();
  await expect(page.getByRole("tab", { name: /Quiz/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("question-0")).toBeVisible();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("Brief / Code / Checks steps with Run in a sticky bottom bar", async ({ page }) => {
    const t = byId("s01-t04");
    await open(page, t.id);
    const steps = page.getByRole("tablist", { name: "Ticket steps" });
    await expect(steps.getByRole("tab")).toHaveCount(3);
    const brief = steps.getByRole("tab", { name: /Brief/ });
    const code = steps.getByRole("tab", { name: /Code/ });
    const checksTab = steps.getByRole("tab", { name: /Checks/ });
    await expect(brief).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("ticket-goal")).toBeInViewport();
    await expect(page.locator(".monaco-editor")).toBeHidden();

    // Run sits in a bar fixed to the bottom of the screen.
    const run = page.getByTestId("run-tests");
    await expect(run).toBeInViewport();
    const box = (await page.getByTestId("run-bar").boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(844 - 2);

    // Arrow keys move between steps.
    await brief.focus();
    await page.keyboard.press("ArrowRight");
    await expect(code).toHaveAttribute("aria-selected", "true");
    await expect(code).toBeFocused();
    await expect(page.locator(".monaco-editor").first()).toBeVisible();
    await expect(page.getByTestId("ticket-goal")).toBeHidden();
    await expect(page.getByTestId("file-tab").first()).toContainText(t.filesEditable[0]);

    // Running switches to the checks.
    await runTests(page);
    await expect(checksTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("run-summary")).toBeInViewport();
    await expect(page.locator(".monaco-editor")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("review code wraps instead of running off the screen", async ({ page }) => {
    await open(page, "s02-t05");
    await page.getByRole("tab", { name: /Pull request/ }).click();
    await expect(page.getByTestId("review-instructions")).toBeVisible();
    const file = page.getByTestId("pr-file");
    const overflow = await file.evaluate((el) => el.parentElement!.scrollWidth - el.parentElement!.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
