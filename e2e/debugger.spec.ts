// The step-through debugger: re-run one failing check with tracing in Pyodide
// and walk through it line by line, on Season 1 ticket 4 (cart subtotal).
import { expect, test, type Page } from "@playwright/test";
import { runTests, seasonTickets, seedSolved, setEditorFile, ticketUrl, trackPageErrors, waitForPython } from "./helpers";

const tickets = seasonTickets();
const t04 = tickets.find((t) => t.id === "s01-t04")!;
const before = tickets.slice(0, tickets.indexOf(t04));

type MonacoWindow = Window & {
  monaco?: {
    editor: {
      getModels(): { uri: { path: string }; getAllDecorations(): { range: { startLineNumber: number }; options: { className?: string | null } }[] }[];
    };
  };
};

/** Line number of the debugger's highlight in a file's Monaco model, or null. */
async function highlightedLine(page: Page, path: string): Promise<number | null> {
  return page.evaluate((p) => {
    const model = (window as MonacoWindow).monaco?.editor.getModels().find((m) => m.uri.path === p);
    const deco = model?.getAllDecorations().find((d) => d.options.className === "debug-current-line");
    return deco ? deco.range.startLineNumber : null;
  }, `/${t04.id}/${path}`);
}

const variable = (page: Page, name: string) => page.getByTestId("debugger-vars").locator(`tr[data-var="${name}"]`);

async function openT04(page: Page) {
  await seedSolved(page, before);
  await page.goto(ticketUrl(t04.id));
  await waitForPython(page);
  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
}

test("step through a failing check: lines, changing variables and the expected answer", async ({ page }) => {
  const errors = trackPageErrors(page);
  await openT04(page);

  const check = page.locator("li", { hasText: "last item is counted" });
  await check.getByRole("button", { name: /Step through/ }).click();
  const dbg = page.getByTestId("debugger");
  await expect(dbg).toBeVisible();
  await expect(dbg).toContainText("last item is counted");
  await expect(page.getByTestId("debugger-position")).toContainText(/Step 1 of \d+/);
  await expect(page.getByTestId("debugger-caption")).toHaveText("cart_subtotal is called with prices = [450, 299]");
  await expect(page.getByTestId("debugger-stack")).toContainText("test_last_item_is_counted");

  // Step forward with the button and the keyboard: the highlighted line moves.
  await expect.poll(() => highlightedLine(page, t04.filesEditable[0])).toBe(8);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect.poll(() => highlightedLine(page, t04.filesEditable[0])).toBe(10);
  await page.getByTestId("debugger-caption").click(); // focus outside the editor for arrow keys
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => highlightedLine(page, t04.filesEditable[0])).toBe(11);
  await expect(variable(page, "total")).toContainText("0");
  await expect(variable(page, "total")).toHaveAttribute("data-changed", "new");

  await page.getByRole("button", { name: "Next step" }).click();
  await expect(variable(page, "i")).toContainText("0");
  // Back round the loop: total changed from 0 to 450.
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByTestId("debugger-caption")).toContainText("back to the top of the loop");
  await expect(variable(page, "total")).toContainText("450");
  await expect(variable(page, "total")).toHaveAttribute("data-changed", "changed");
  await page.keyboard.press("ArrowLeft");
  await expect(variable(page, "total")).toContainText("0");
  await page.keyboard.press("ArrowRight");

  // Jump to the end: the return value, then the check's expected-vs-got message.
  const slider = page.getByRole("slider", { name: "Step" });
  const max = Number(await slider.getAttribute("max"));
  await slider.fill(String(max - 1));
  await expect(page.getByTestId("debugger-caption")).toHaveText("cart_subtotal returns 450");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByTestId("debugger-position")).toHaveText(new RegExp(`Step ${max + 1} of ${max + 1}`));
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  const result = page.getByTestId("debugger-result");
  await expect(result).toContainText("should be 749, got 450");

  await page.getByRole("button", { name: /Close the debugger/ }).click();
  await expect(dbg).toHaveCount(0);
  await expect(page.getByTestId("run-summary")).toBeVisible();
  await expect.poll(() => highlightedLine(page, t04.filesEditable[0])).toBeNull();
  expect(errors).toEqual([]);
});

test("a very long loop stops after 300 steps", async ({ page }) => {
  await openT04(page);
  // Finishes quickly in a normal run, but takes far more than 300 steps.
  const code = "def cart_subtotal(prices):\n    total = 0\n    while total < 10_000:\n        total += 1\n    return total\n";
  await setEditorFile(page, t04.id, t04.filesEditable[0], code);
  await runTests(page);
  await page.locator("li", { hasText: "empty cart is zero" }).getByRole("button", { name: /Step through/ }).click();
  await expect(page.getByTestId("debugger-position")).toContainText("Step 1 of 301");
  await page.getByRole("slider", { name: "Step" }).fill("300");
  await expect(page.getByTestId("debugger-caption")).toHaveText("⏹ Stopped after 300 steps — is there a loop that never ends?");
});

test("the debugger fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openT04(page);
  await page.locator("li", { hasText: "three items" }).getByRole("button", { name: /Step through/ }).click();
  await expect(page.getByTestId("debugger")).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(variable(page, "total")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
