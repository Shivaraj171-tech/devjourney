// Regression tests for bugs found by QA (see the e2e report):
// SystemExit handling, Ctrl+Enter inside Monaco, first-paint lock flash,
// Pyodide on locked tickets, mobile overflow, and the lesson.
import { expect, test } from "@playwright/test";
import { readProgress, runTests, seasonTickets, setEditorFile, ticketUrl, waitForPython } from "./helpers";

const tickets = seasonTickets();
const [t01, t02] = tickets;
const file = t01.filesEditable[0];

test("exit() in learner code is a normal test result with an explanation", async ({ page }) => {
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  for (const code of ['print("bye")\nraise SystemExit(1)\n', "def greet(name):\n    exit()\n"]) {
    await setEditorFile(page, t01.id, file, code);
    await runTests(page);
    await expect(page.getByTestId("run-error")).toHaveCount(0);
    await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
    await expect(page.getByText(/SystemExit/).first()).toBeVisible();
    await expect(page.getByTestId("explanation").first()).toContainText("exit()");
  }
  // Python is still usable afterwards (Run button enabled, not restarting).
  await expect(page.getByTestId("run-tests")).toBeEnabled();
});

test("Ctrl+Enter inside the Monaco editor runs the tests", async ({ page }) => {
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  const before = await page.evaluate(
    (p) => (window as unknown as { monaco: { editor: { getModels(): { uri: { path: string }; getValue(): string }[] } } })
      .monaco.editor.getModels().find((m) => m.uri.path === p)!.getValue(),
    `/${t01.id}/${file}`,
  );
  await page.locator(".monaco-editor .view-lines").click();
  // Monaco may use EditContext instead of a textarea, so ask the editor itself.
  await page.waitForFunction(() =>
    (window as unknown as { monaco: { editor: { getEditors(): { hasTextFocus(): boolean }[] } } }).monaco.editor
      .getEditors()
      .some((e) => e.hasTextFocus()),
  );
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByTestId("run-summary")).toBeVisible({ timeout: 30_000 });
  expect((await readProgress(page)).tickets[t01.id].runs).toBe(1);
  // The shortcut must not also insert a line into the code.
  const after = await page.evaluate(
    (p) => (window as unknown as { monaco: { editor: { getModels(): { uri: { path: string }; getValue(): string }[] } } })
      .monaco.editor.getModels().find((m) => m.uri.path === p)!.getValue(),
    `/${t01.id}/${file}`,
  );
  expect(after).toBe(before);
});

test("static HTML doesn't flash the locked message or progress-dependent HQ content", async ({ request }) => {
  const ticketHtml = await (await request.get(ticketUrl(t02.id))).text();
  expect(ticketHtml).not.toContain("still in the backlog");
  const hqHtml = await (await request.get("/")).text();
  expect(hqHtml).toContain("Opening the office");
  expect(hqHtml).not.toContain("Welcome back");
});

test("a locked ticket page doesn't download Python", async ({ page }) => {
  const pyodideRequests: string[] = [];
  page.on("request", (r) => {
    if (/pyodide\.asm\.wasm|runner-worker\.js/.test(r.url())) pyodideRequests.push(r.url());
  });
  await page.goto(ticketUrl(tickets[4].id));
  await expect(page.getByRole("heading", { name: /still in the backlog/ })).toBeVisible();
  await page.waitForTimeout(2_000);
  expect(pyodideRequests).toEqual([]);
});

test.describe("phone viewport", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("ticket page has no horizontal overflow and Run is visible", async ({ page }) => {
    await page.goto(ticketUrl(t01.id));
    const run = page.getByTestId("run-tests");
    await expect(run).toBeVisible();
    await waitForPython(page);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
    const box = await run.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "test-results/e2e/mobile-ticket.png", fullPage: true });
  });

  test("HQ has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("office-map").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test("the 2-minute lesson on s01-t01 unfolds in the brief and shows the Strings lesson with a code block", async ({ page }) => {
  await page.goto(ticketUrl(t01.id));
  const toggle = page.getByTestId("lesson-toggle");
  // Ticket 1 (a tutorial ticket), first visit: the lesson is already open, before any run
  // (read, learn, fix: the order onboarding promises). It still folds and unfolds.
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await page.getByTestId("lesson").evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(
    await page.getByTestId("byte-teaser").evaluate((el) => el.getBoundingClientRect().top),
  );
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const lesson = page.getByTestId("lesson");
  // The toggle label also says "Strings" now (human concept names), so take the lesson title.
  await expect(lesson.getByText("Strings", { exact: true }).last()).toBeVisible();
  const code = lesson.locator("pre").first();
  await expect(code).toBeVisible();
  await expect(code).toContainText('f"');
  await toggle.click();
  await expect(lesson.locator("pre")).toHaveCount(0);
});
