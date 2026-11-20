// Second visits and offline play: the service worker (scripts/sw.template.js ->
// public/sw.js) keeps Pyodide, Monaco, the runner and visited pages on the device.
// Also: on a phone, the editor isn't downloaded until the Code step opens.
import { expect, test, type Page } from "@playwright/test";
import { readProgress, runTests, seasonTickets, setEditorFile, solutionFile, ticketUrl, trackPageErrors, waitForPython } from "./helpers";

const [t01] = seasonTickets();
const file = t01.filesEditable[0];

/** Every URL in this site's service-worker caches. */
async function cachedUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("devjourney:")) continue;
      for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
    }
    return urls;
  });
}

test("after one visit, a ticket opens and runs its tests offline", async ({ page, context }) => {
  test.setTimeout(180_000);
  const errors = trackPageErrors(page);
  await page.goto(ticketUrl(t01.id));
  await waitForPython(page);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  // Python, the runner, the editor and the page itself were cached on the way in.
  await expect
    .poll(async () => {
      const urls = await cachedUrls(page);
      return [
        urls.includes("/pyodide/pyodide.asm.wasm"),
        urls.includes("/pyodide/python_stdlib.zip"),
        urls.includes("/runner-worker.js"),
        urls.includes("/runner/test_runner.py"),
        urls.some((u) => u.startsWith("/monaco/vs/")),
        urls.includes(ticketUrl(t01.id)),
      ];
    }, { timeout: 30_000 })
    .toEqual([true, true, true, true, true, true]);

  await context.setOffline(true);

  // Second visit, offline: a fresh tab on the same ticket.
  const offline = await context.newPage();
  const offlineErrors = trackPageErrors(offline);
  await offline.goto(ticketUrl(t01.id));
  await waitForPython(offline);
  await setEditorFile(offline, t01.id, file, solutionFile(t01, file));
  await runTests(offline);
  await expect(offline.getByTestId("solved-modal")).toBeVisible();

  // A page never opened before says so instead of the browser's error page.
  await offline.goto("/review/s04/");
  await expect(offline.getByRole("heading", { name: "You're offline" })).toBeVisible();

  await context.setOffline(false);
  expect(errors).toEqual([]);
  expect(offlineErrors).toEqual([]);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the editor (Monaco) is only downloaded once the Code step opens", async ({ page }) => {
    const monaco: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/monaco/vs/")) monaco.push(r.url());
    });
    await page.goto(ticketUrl(t01.id));
    await waitForPython(page); // Python still warms up while reading the brief
    expect(monaco).toEqual([]);

    await page.getByRole("tab", { name: /Code/ }).click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible();
    expect(monaco.length).toBeGreaterThan(0);
    // The editor was just created: retry until its change handler has saved the edit.
    await expect(async () => {
      await setEditorFile(page, t01.id, file, solutionFile(t01, file));
      expect((await readProgress(page))?.tickets?.[t01.id]?.code?.[file]).toBe(solutionFile(t01, file));
    }).toPass({ timeout: 20_000 });
    await runTests(page);
    await expect(page.getByTestId("solved-modal")).toBeVisible();
  });
});
