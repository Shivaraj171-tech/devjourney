// "My coding profile": personalization from what the learner's code did, all in the
// browser. Seeded progress (KeyErrors on ticket 6, Byte's wrong code waved through)
// shows a dictionaries focus with its evidence and the "trusts Byte quickly" habit;
// the HQ, warm-ups and Bug Bounty follow it; adaptive help appears after 3 failed runs.
//
// Set PROFILE_SHOTS_DIR to also save desktop and 390px screenshots there.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PROGRESS_KEY, editorValue, readProgress, revealByteCard, runTests, seasonTickets, seedSolved, setEditorFile, ticketUrl, trackPageErrors, waitForPython } from "./helpers";

const season1 = seasonTickets();
const T6 = season1[5]; // "Order again": dictionaries, its starter crashes with a KeyError
const SHOTS = process.env.PROFILE_SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function patchProgress(page: Page, patch: (p: Record<string, unknown>) => void) {
  const p = await readProgress(page);
  patch(p);
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), { key: PROGRESS_KEY, value: p });
  await page.reload();
}

type Tickets = Record<string, Record<string, unknown>>;

/** Ticket 6 took 4 runs: 3 KeyErrors (the code changed each time), then a pass. */
function keyErrorLog(now: number) {
  const fail = (i: number) => ({
    at: now - (10 - i) * 60_000,
    passed: 2,
    total: 4,
    failing: ["test_removed_item_is_skipped", "test_only_removed_items_gives_empty_cart"],
    errors: ["KeyError"],
    changed: true,
    hash: `h${i}`,
  });
  return [fail(1), fail(2), fail(3), { at: now - 60_000, passed: 4, total: 4, failing: [], errors: [], changed: true, hash: "h4" }];
}

/** Seed: tickets 1-`solved` merged; KeyErrors on ticket 6; optionally Byte's wrong code on tickets 3 and 4 accepted and run
 *  (tickets 1-2 are practice rounds that don't count toward habits). */
async function seedPattern(page: Page, solved: number, opts: { byte?: boolean } = {}) {
  await seedSolved(page, season1.slice(0, solved));
  await patchProgress(page, (p) => {
    const tickets = p.tickets as Tickets;
    const now = Date.now();
    Object.assign(tickets[T6.id], { runs: 4, runLog: keyErrorLog(now) });
    if (opts.byte) {
      // Accepted as-is, then run (runs 1 > runsAtDecision 0): "waved through".
      for (const t of season1.slice(2, 4)) tickets[t.id].byteSuggestion = { decision: "accept", correct: false, runsAtDecision: 0 };
    }
  });
}

test("new learner: an empty profile that explains itself", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/profile/");
  await expect(page.getByTestId("profile-empty")).toBeVisible();
  await expect(page.getByTestId("profile-how")).toContainText("nothing leaves your browser");
  await expect(page.getByTestId("profile-focus")).toHaveCount(0);
  await shot(page, "empty-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "empty-390");
  expect(errors).toEqual([]);
});

test("KeyErrors + Byte waved through: dictionaries focus with evidence, 'trusts Byte quickly', and the HQ follows", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedPattern(page, 6, { byte: true });

  // HQ: the Today card's personal line, and the Bug Bounty recommendation.
  const focus = page.getByTestId("today-focus");
  await expect(focus).toContainText("Focus this week: dictionaries (3 KeyErrors on #6");
  const bounty = page.getByTestId("bug-bounty");
  await expect(bounty.getByTestId("bounty-recommended")).toHaveCount(1);
  const recommended = bounty.locator("li[data-recommended]");
  await expect(recommended).toHaveAttribute("data-testid", "bounty-s50-t05"); // the dictionary mystery bug
  // Shown first on the board.
  await expect(bounty.locator("li").first()).toHaveAttribute("data-testid", "bounty-s50-t05");
  await shot(page, "hq-desktop");

  // The profile page, from the Today card.
  await page.getByTestId("today-profile-link").click();
  await expect(page).toHaveURL(/\/profile\/?$/);
  const dict = page.getByTestId("focus-dictionaries");
  await expect(dict).toBeVisible();
  await expect(dict.getByTestId("focus-evidence")).toContainText("3 KeyErrors on #6 “Order again? KeyError.”");
  // Practice made for this focus area: the bounty, the lesson and the warm-ups.
  await expect(dict.getByTestId("practice-bounty")).toHaveAttribute("href", "/ticket/s50-t05/");
  await expect(dict.getByTestId("practice-lesson")).toHaveAttribute("href", `/ticket/${T6.id}/#lesson`);
  await expect(dict.getByTestId("practice-warmup").first()).toBeVisible();

  const trust = page.getByTestId("habit-trusts-byte");
  await expect(trust).toContainText("Trusts Byte quickly");
  await expect(trust).toContainText("#3, #4");
  await page.getByTestId("profile-how").locator("summary").click();
  await expect(page.getByTestId("profile-how")).toContainText("nothing is uploaded");
  await shot(page, "profile-desktop");

  // 390px: no horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dict).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await shot(page, "profile-390");
  await page.goto("/");
  await expect(page.getByTestId("today-focus")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await shot(page, "hq-390");
  expect(errors).toEqual([]);
});

test("Byte's card gets a one-line nudge for a learner who trusts Byte quickly", async ({ page }) => {
  await seedPattern(page, 7, { byte: true });
  const t8 = season1[7];
  await page.goto(ticketUrl(t8.id));
  // First visits show a teaser until the learner runs the checks or peeks.
  await revealByteCard(page);
  await expect(page.getByTestId("byte-trust-nudge")).toHaveText(/Byte's last few changes went through unchecked\. Try one example on the next one first\./);
  await shot(page, "byte-nudge-desktop");

  // Without the habit: no nudge.
  await seedPattern(page, 7);
  await page.goto(ticketUrl(t8.id));
  // First visits show a teaser until the learner runs the checks or peeks.
  await revealByteCard(page);
  await expect(page.getByTestId("byte-trust-nudge")).toHaveCount(0);
});

test("the warm-up session favours the weak concept", async ({ page }) => {
  await seedPattern(page, 6);
  const card = page.getByTestId("daily-warmup");
  await expect(card).toBeVisible();
  await expect(card.getByTestId("warmup-reason")).toHaveText("Made for you: Dictionaries is a focus area on your coding profile");
  const id = await card.getByTestId("warmup-item").getAttribute("data-warmup-id");
  expect(["w014", "w015"]).toContain(id);
});

test("adaptive help after 3 failed runs on the same check, and the run log stores no code", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, season1.slice(0, 5));
  await page.goto(ticketUrl(T6.id));
  await waitForPython(page);
  const path = T6.filesEditable[0];

  for (let i = 1; i <= 3; i++) {
    if (i > 1) {
      // A small change each time (a comment), so these are real attempts.
      const base = (await editorValue(page, T6.id, path)) ?? "";
      await setEditorFile(page, T6.id, path, `${base}\n# try ${i}\n`);
    }
    await runTests(page);
    await expect(page.getByTestId("run-summary")).toBeVisible();
    if (i < 3) await expect(page.getByTestId("adaptive-help")).toHaveCount(0);
  }

  const help = page.getByTestId("adaptive-help");
  await expect(help).toBeVisible();
  await expect(help).toHaveAttribute("data-help", "keyerror");
  await expect(help).toContainText("Step through to see what the dictionary holds");
  await expect(page.getByTestId("adaptive-help-why")).toContainText("3 runs in a row");
  await shot(page, "adaptive-help-desktop");

  // The run log: compact, no source code.
  const log = (await readProgress(page)).tickets[T6.id].runLog as { errors: string[]; changed: boolean; failing: string[] }[];
  expect(log).toHaveLength(3);
  expect(log.every((e) => e.errors.includes("KeyError"))).toBe(true);
  expect(log.map((e) => e.changed)).toEqual([true, true, true]);
  expect(JSON.stringify(log)).not.toContain("def ");
  expect(JSON.stringify(log)).not.toContain("# try");

  // Taking the offer opens the debugger on that check.
  await page.getByTestId("adaptive-help-action").click();
  await expect(page.getByTestId("debugger")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Close the debugger and show the CI checks" }).click();

  // "Not now" hides it.
  await expect(page.getByTestId("adaptive-help")).toBeVisible();
  await page.getByTestId("adaptive-help-dismiss").click();
  await expect(page.getByTestId("adaptive-help")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("adaptive help on a phone (390px): running the same code again says 'change one thing'", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSolved(page, season1.slice(0, 5));
  await page.goto(ticketUrl(T6.id));
  await waitForPython(page);
  for (let i = 0; i < 3; i++) {
    await page.getByTestId("run-tests").click();
    await expect(page.getByTestId("run-summary")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("run-tests")).toBeEnabled();
  }
  const help = page.getByTestId("adaptive-help");
  await expect(help).toBeVisible();
  await expect(help).toHaveAttribute("data-help", "change-one-thing");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await shot(page, "adaptive-help-390");
});
