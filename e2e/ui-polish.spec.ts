// UI polish after the redesign's QA review (docs/design/ui-redesign-qa.md, O1-O6):
// an h1 on every phone step, focus that never falls to <body>, a Run button that stays
// focusable while Python loads, radiogroups with arrow keys, the separator's Home/End,
// and an editor that keeps about 12 lines after a run at 1280x800.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import { allSeasonTickets, revealByteCard, runTests, seasonTickets, seedSolved, ticketUrl, waitForPython } from "./helpers";

const season1 = seasonTickets();
const t01 = season1[0];
const t01Title = (load(readFileSync(join(t01.dir, "ticket.yaml"), "utf-8")) as { title: string }).title;
const all = allSeasonTickets();

/** The first story ticket whose Byte suggestion asks "why?" (picked from the content, not hard-coded). */
const whyTicket = all.find((t) => {
  try {
    const y = load(readFileSync(join(t.dir, "byte.yaml"), "utf-8")) as { suggestion?: { why?: unknown } };
    return y?.suggestion?.why !== undefined;
  } catch {
    return false;
  }
});

const focused = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return a ? (a.getAttribute("data-testid") ?? a.tagName) : null;
  });

test.describe("desktop 1280x800", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("after a run the editor keeps at least 12 lines, and the results pane still grows (capped)", async ({ page }) => {
    await seedSolved(page, []);
    await page.goto(ticketUrl(t01.id));
    await waitForPython(page);
    const sep = page.getByTestId("results-resizer");
    const before = Number(await sep.getAttribute("aria-valuenow"));
    expect(before).toBe(45); // the plan's default share
    const paneBefore = (await page.getByTestId("results-pane").boundingBox())!.height;
    await runTests(page);
    const editor = page.getByTestId("code-panel").locator(".monaco-editor").first();
    const editorH = (await editor.boundingBox())!.height;
    // 12 lines of 20 px plus the editor's 12 px top padding.
    expect(editorH).toBeGreaterThanOrEqual(12 * 20 + 12);
    expect((await page.getByTestId("results-pane").boundingBox())!.height).toBeGreaterThan(paneBefore);
    // The learner can still drag (here: key) the pane larger than the automatic size.
    const auto = Number(await sep.getAttribute("aria-valuenow"));
    await sep.focus();
    await page.keyboard.press("End");
    const max = Number(await sep.getAttribute("aria-valuemax"));
    await expect(sep).toHaveAttribute("aria-valuenow", String(max));
    expect(max).toBeGreaterThan(auto);
  });

  test("separator: Home gives the results pane its smallest size, End its largest (window splitter pattern)", async ({ page }) => {
    await seedSolved(page, []);
    await page.goto(ticketUrl(t01.id));
    await waitForPython(page);
    const sep = page.getByTestId("results-resizer");
    const pane = page.getByTestId("results-pane");
    await sep.focus();
    await page.keyboard.press("Home");
    await expect(sep).toHaveAttribute("aria-valuenow", await sep.getAttribute("aria-valuemin") as string);
    const small = (await pane.boundingBox())!.height;
    await page.keyboard.press("End");
    await expect(sep).toHaveAttribute("aria-valuenow", await sep.getAttribute("aria-valuemax") as string);
    const large = (await pane.boundingBox())!.height;
    expect(large).toBeGreaterThan(small);
    // aria-valuenow matches the pane's real share of the column.
    const column = (await page.getByRole("region", { name: "Code and checks" }).boundingBox())!.height;
    expect(Math.abs((large / column) * 100 - Number(await sep.getAttribute("aria-valuenow")))).toBeLessThan(2);
  });
});

test("focus: 'Let's go' moves focus to the first ticket's Start button", async ({ page }) => {
  await page.goto("/");
  const go = page.getByTestId("onboarding").getByRole("button", { name: /Let's go/ });
  await expect(go).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  await expect(page.getByTestId("continue")).toBeFocused();
});

test("focus: 'Peek now' moves focus to Byte's card it opened", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  const peek = page.getByTestId("byte-teaser-open");
  await peek.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("byte-suggestion")).toBeFocused();
});

test("focus: a failing run keeps focus on Run tests and announces the result politely", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  const run = page.getByTestId("run-tests");
  await run.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("run-summary")).toBeVisible({ timeout: 30_000 });
  expect(await focused(page)).toBe("run-tests");
  const news = page.getByTestId("run-announcer");
  await expect(news).toHaveAttribute("aria-live", "polite");
  await expect(news).toHaveText(/\d+ of \d+ checks passing\./);
});

test.describe("slow network", () => {
  test.use({ serviceWorkers: "block" });

  test("Run stays focusable (aria-disabled) while Python loads, and names the loading stage", async ({ page, context }) => {
    await context.route("**/pyodide/pyodide.asm.wasm", async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await seedSolved(page, []);
    await page.goto(ticketUrl(t01.id));
    const run = page.getByTestId("run-tests");
    await expect(run).toHaveAttribute("aria-disabled", "true");
    await expect(run).not.toHaveAttribute("disabled", /.*/);
    await expect(run).toHaveText(/Getting Python ready|Downloading Python|Starting Python|Loading the checks/);
    await expect(run).toHaveAccessibleDescription(/Python is still loading/);
    await run.focus();
    await expect(run).toBeFocused();
    // Pressing it early does nothing (no run, no error).
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("run-summary")).toHaveCount(0);
    await waitForPython(page);
    await expect(run).not.toHaveAttribute("aria-disabled", /.*/);
    await expect(run).toHaveText("▶ Run tests");
  });
});

test("radiogroup: the theme picker is one Tab stop and the arrow keys move the choice", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto("/settings/");
  const group = page.getByRole("radiogroup", { name: "Theme" });
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(3);
  // One Tab stop: the checked option.
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(group.locator('[tabindex="0"]')).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("theme-system").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("theme-dark")).toBeFocused();
  await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("theme-system")).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("End");
  await expect(page.getByTestId("theme-light")).toBeFocused();
  // Tab leaves the group in one step.
  await page.keyboard.press("Tab");
  expect(await focused(page)).not.toMatch(/^theme-/);
  await page.getByTestId("theme-system").click();
});

test("radiogroup: Byte's reasons are one Tab stop and the arrow keys pick a reason", async ({ page }) => {
  test.skip(!whyTicket, "no Byte suggestion with a 'why' in the content");
  const t = whyTicket!;
  await seedSolved(page, all.slice(0, all.indexOf(t)));
  await page.goto(ticketUrl(t.id));
  await revealByteCard(page);
  await page.getByTestId("byte-reject").click();
  const group = page.getByTestId("byte-why").getByRole("radiogroup");
  const radios = group.getByRole("radio");
  const n = await radios.count();
  expect(n).toBeGreaterThan(1);
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await radios.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeFocused();
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(group.locator('[aria-checked="true"]')).toHaveCount(1);
  await expect(group.locator('[tabindex="0"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("byte-lock")).toBeEnabled();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("every ticket step has one h1: Brief, Code and Checks", async ({ page }) => {
    await seedSolved(page, []);
    await page.goto(ticketUrl(t01.id));
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(t01Title);
    await page.getByRole("tab", { name: /Code/ }).click();
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(t01Title);
    await expect(h1).toContainText("the code");
    await page.getByRole("tab", { name: /Checks/ }).click();
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("the checks");
  });

  test("home is short on a phone, the primary action is on the first screen, and folded sections open", async ({ page }) => {
    await seedSolved(page, season1.slice(0, 6));
    await expect(page.getByTestId("continue")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(4600);
    // The side floors are still listed, each with what opens it.
    await expect(page.getByTestId("side-floors")).toContainText("Robotics Lab");
    await expect(page.getByTestId("side-floors")).toContainText(/opens after/);
    // Locked bounties fold into one line that opens.
    const fold = page.getByTestId("bounty-locked-fold");
    if (await fold.count()) {
      await fold.locator("summary").click();
      await expect(fold.locator('[data-state="locked"]').first()).toBeVisible();
    }
  });
});
