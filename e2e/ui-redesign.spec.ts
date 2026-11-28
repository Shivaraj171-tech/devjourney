// UI redesign (docs/design/ui-redesign-plan.md) and the UI audit fixes:
// the editor's keyboard escape, the "code didn't load" feedback, the phone
// Profile link, the locked side floors for newcomers, the skip link, the
// resizable results pane and the Python loading stages.
import { expect, test, type Page } from "@playwright/test";
import { editorValue, readProgress, runTests, seasonTickets, seedSolved, setEditorFile, ticketUrl, trackPageErrors, waitForPython } from "./helpers";

const season1 = seasonTickets();
const t01 = season1[0];

async function focusEditor(page: Page) {
  await page.locator(".monaco-editor .view-lines").first().click();
  await expect(page.getByTestId("editor-keyboard-hint")).toHaveAttribute("data-visible", "true");
}

test("keyboard: Esc then Tab leaves the editor without changing the code, and reaches Run tests", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  const before = await editorValue(page, t01.id, "app/greeting.py");
  await focusEditor(page);
  // The hint says how to get out.
  await expect(page.getByTestId("editor-keyboard-hint")).toContainText("Esc");
  await expect(page.getByTestId("editor-keyboard-hint")).toContainText("Ctrl+M");

  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  // Out of the editor: the next control is the results pane's resize handle, then Run tests.
  await expect(page.getByTestId("results-resizer")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("run-tests")).toBeFocused();
  expect(await editorValue(page, t01.id, "app/greeting.py")).toBe(before);

  // Enter on the focused button runs the checks: the whole loop works without a mouse.
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("run-summary")).toBeVisible();
  await expect(page.getByTestId("hints-toggle").first()).toBeVisible();
});

test("keyboard: Ctrl+M makes Tab move focus out of the editor (and back to indenting)", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  const before = await editorValue(page, t01.id, "app/greeting.py");
  await focusEditor(page);
  await page.keyboard.press("Control+m");
  await expect(page.getByTestId("editor-keyboard-hint")).toContainText("Tab now moves focus");
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("results-resizer")).toBeFocused();
  expect(await editorValue(page, t01.id, "app/greeting.py")).toBe(before);
  // And on to Run tests: no trap.
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("run-tests")).toBeFocused();
});

test("feedback: code that fails to load says so, keeps the real check count, and never says 'one check to go'", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  // An indentation error at the top of the file: the import fails, so no check can run.
  const broken = "    " + ((await editorValue(page, t01.id, "app/greeting.py")) ?? "");
  await setEditorFile(page, t01.id, "app/greeting.py", broken);
  await runTests(page);
  const total = await page.getByTestId("acceptance-checklist").locator("li").count();
  expect(total).toBeGreaterThan(1);
  await expect(page.getByTestId("run-summary")).toContainText(`0 of ${total} checks could run`);
  await expect(page.getByTestId("run-encouragement")).toContainText("didn't load");
  await expect(page.getByTestId("run-encouragement")).not.toContainText(/one check to go/i);
});

test("results pane: a real separator that resizes with the arrow keys, and grows after a run", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  const sep = page.getByTestId("results-resizer");
  await expect(sep).toHaveAttribute("role", "separator");
  const start = Number(await sep.getAttribute("aria-valuenow"));
  const paneStart = (await page.getByTestId("results-pane").boundingBox())!.height;
  await sep.focus();
  await page.keyboard.press("ArrowUp");
  await expect(sep).toHaveAttribute("aria-valuenow", String(start + 5));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(sep).toHaveAttribute("aria-valuenow", String(start - 5));
  // A run makes room for the results.
  await runTests(page);
  expect(Number(await sep.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(50);
  expect((await page.getByTestId("results-pane").boundingBox())!.height).toBeGreaterThan(paneStart);
});

test.describe("slow network", () => {
  test.use({ serviceWorkers: "block" });

  test("Python loading shows its real stage, not just a grey button", async ({ page, context }) => {
    // Hold the big Python file back for a moment so the loading state is visible.
    await context.route("**/pyodide/pyodide.asm.wasm", async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await seedSolved(page, []);
    await page.goto(ticketUrl(t01.id));
    const progress = page.getByTestId("python-progress");
    await expect(progress).toBeVisible();
    await expect(progress.getByRole("progressbar", { name: "Loading Python" })).toBeVisible();
    await expect(progress).toContainText(/Getting Python ready|Downloading Python/);
    await expect(page.getByTestId("python-loading")).toContainText("You can read the brief meanwhile");
    await waitForPython(page);
    await expect(progress).toHaveCount(0);
    await expect(page.getByTestId("check-pill")).toBeVisible();
  });
});

test("newcomers see the side floors as locked floors, with what's inside and what opens them", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await page.getByTestId("onboarding").getByRole("button", { name: /Let's go/ }).click();
  const locked = page.getByTestId("locked-side-floors");
  await expect(locked).toBeVisible();
  for (const id of ["s40", "manipulators", "bounty"]) {
    const row = page.getByTestId(`locked-floor-${id}`);
    await expect(row).toHaveAttribute("data-state", "locked");
    await expect(row.locator('[data-icon="lock"]')).toHaveCount(1);
    await expect(row).toContainText(/[Oo]pens/);
  }
  await expect(page.getByTestId("locked-floor-s40")).toContainText("Robotics Lab");
  await expect(page.getByTestId("locked-floor-s40")).toContainText("Opens after Floor 1");
  await expect(page.getByTestId("locked-floor-manipulators")).toContainText("UR5e");
  await expect(page.getByTestId("locked-floor-bounty")).toContainText("Bug Bounty");
  // Locked rows are not links.
  await expect(locked.locator("a")).toHaveCount(0);
  // One primary action: one "continue" button, and no skills check in minute one.
  await expect(page.getByTestId("continue")).toHaveCount(1);
  await expect(page.getByTestId("continue")).toHaveText(`Start ticket #1`);
  await expect(page.getByTestId("skills-card")).toHaveCount(0);
  // The leaderboard widget says the teammates are made up.
  await expect(page.getByTestId("mini-leaderboard").getByTestId("fictional-note")).toContainText("fictional");
  expect(errors).toEqual([]);
});

test("a skip link jumps past the top bar to the page content", async ({ page }) => {
  await seedSolved(page, []);
  await page.keyboard.press("Tab");
  const skip = page.getByTestId("skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("the streak counts a merge, not pressing Run on a fresh ticket", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  await runTests(page); // the starter fails
  await expect(page.getByTestId("run-summary")).toBeVisible();
  expect((await readProgress(page)).activeDays).toEqual([]);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("Profile is in the phone nav, and the bar fits 390px", async ({ page }) => {
    await seedSolved(page, season1.slice(0, 3));
    const profile = page.getByTestId("profile-link");
    await expect(profile).toBeVisible();
    const box = (await profile.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(24);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await profile.click();
    await expect(page).toHaveURL(/\/profile\/?$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("the home screen's first screen holds the one primary action", async ({ page }) => {
    await seedSolved(page, []);
    await expect(page.getByTestId("continue")).toBeInViewport();
    await expect(page.getByTestId("locked-side-floors")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe("light theme", () => {
  test.use({ colorScheme: "light" });

  test("follows the system setting, and Settings can pin a theme", async ({ page }) => {
    await seedSolved(page, []);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await bg()).toBe("rgb(244, 246, 251)");
    await page.goto("/settings/");
    await page.getByTestId("theme-dark").click();
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-checked", "true");
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    expect(await bg()).toBe("rgb(19, 24, 51)");
    await page.goto("/settings/");
    await page.getByTestId("theme-system").click();
    await page.goto("/");
    expect(await bg()).toBe("rgb(244, 246, 251)");
  });
});
