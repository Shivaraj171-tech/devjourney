// HQ layout: progressive disclosure for newcomers, a "Today" card for returning
// players, collapsed floors, the shareable score, the onboarding dialog's
// keyboard behaviour, and no sideways scroll on a phone.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import { PROGRESS_KEY, readProgress, seasonTickets, seedSolved, trackPageErrors } from "./helpers";

const season1 = seasonTickets();
const season2 = seasonTickets("s02-week-two");

/** Warm-ups sorted by their longest code line, widest first (the ones most likely to overflow a phone). */
const WARMUPS_DIR = join(__dirname, "..", "content", "warmups");
const widestWarmups = readdirSync(WARMUPS_DIR)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => load(readFileSync(join(WARMUPS_DIR, f), "utf-8")) as { id: string; after: string; code: string })
  .map((w) => ({ ...w, width: Math.max(...w.code.split("\n").map((l) => l.length)) }))
  .sort((a, b) => b.width - a.width);

async function dismissOnboarding(page: Page) {
  await page.getByTestId("onboarding").getByRole("button", { name: /Let's go/ }).click();
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
}

async function scrollWidth(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

/** Season 1 tickets 1-3 merged; Byte's wrong suggestion on ticket 2 was rejected (caught). */
async function seedWithByteCatch(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ key, ids }) => {
      const now = new Date().toISOString();
      const tickets: Record<string, unknown> = {};
      ids.forEach((id, i) => {
        tickets[id] = {
          code: {}, runs: 1, hintsUsed: 0, solved: true, solvedAt: now, solveXp: 100,
          quizFirstPick: [], quizDone: true, quizFirstTryCorrect: 0, quizXp: 0,
          ...(i === 1 ? { byteSuggestion: { decision: "reject", correct: false, runsAtDecision: 0 } } : {}),
        };
      });
      window.localStorage.setItem(key, JSON.stringify({ version: 1, playerName: "You", startedAt: now, activeDays: [], onboarded: true, tickets }));
    },
    { key: PROGRESS_KEY, ids: season1.slice(0, 3).map((t) => t.id) },
  );
  await page.reload();
}

test("first visit: the pitch, Floor 1 open, and no empty sections", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await dismissOnboarding(page);

  await expect(page.getByRole("heading", { level: 1, name: /catch its mistakes/ })).toBeVisible();
  await expect(page.getByTestId("today-card")).toHaveCount(0);
  // Nothing to show yet: no zero stats, no 0/0 score table, no locked warm-up.
  await expect(page.getByTestId("hitl-score")).toHaveCount(0);
  await expect(page.getByTestId("daily-warmup")).toHaveCount(0);
  await expect(page.getByText("Day streak", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Tickets merged", { exact: true })).toHaveCount(0);
  // Badges are a short teaser, not a grid of greyed-out tiles.
  await expect(page.getByTestId("badges")).toContainText("Badges you can earn");
  await expect(page.getByTestId("badges").locator("li")).toHaveCount(3);

  // Floor 1 is a sprint board with the first ticket up next.
  await expect(page.getByTestId("floor-1")).toHaveAttribute("data-expanded", "true");
  await expect(page.getByTestId(`room-${season1[0].id}`)).toBeVisible();
  await expect(page.getByTestId(`room-${season1[0].id}`)).toContainText("Open ticket");
  await expect(page.getByTestId("office-map").first()).not.toContainText("Room 1");
  expect(errors).toEqual([]);
});

test("later floors are one-line rows that expand on demand", async ({ page }) => {
  await seedSolved(page, []);
  const floor2 = page.getByTestId("floor-2");
  await expect(floor2).toHaveAttribute("data-expanded", "false");
  await expect(floor2).toHaveAttribute("data-state", "locked");
  const toggle = floor2.getByRole("button", { name: /Floor 2/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText(`${season2.length} tickets`);
  await expect(toggle).toContainText("🔒");
  // Rooms are still in the page (with their state), just not shown.
  await expect(page.getByTestId(`room-${season2[0].id}`)).toHaveAttribute("data-state", "locked");
  await expect(page.getByTestId(`room-${season2[0].id}`)).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId(`room-${season2[0].id}`)).toBeVisible();
});

test("returning player: a Today card replaces the pitch, and the current floor is the open one", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, season1);
  const today = page.getByTestId("today-card");
  await expect(today).toBeVisible();
  await expect(today).toContainText("Welcome back");
  await expect(today.getByRole("heading", { level: 1 })).toContainText(/#\d+/);
  await expect(page.getByTestId("continue")).toHaveAttribute("href", new RegExp(`/ticket/${season2[0].id}/?$`));
  await expect(page.getByTestId("today-warmup")).toContainText(/Ready|Done/);
  await expect(page.getByTestId("today-rank")).toContainText(/XP to|max rank/);
  await expect(page.getByRole("heading", { name: /catch its mistakes/ })).toHaveCount(0);

  // Floor 1 is finished: collapsed, with the review link still at hand. Floor 2 is open.
  await expect(page.getByTestId("floor-1")).toHaveAttribute("data-expanded", "false");
  await expect(page.getByTestId(`room-${season1[0].id}`)).toBeHidden();
  await expect(page.getByTestId("review-link-s01")).toBeVisible();
  await expect(page.getByTestId("floor-2")).toHaveAttribute("data-expanded", "true");
  await expect(page.getByTestId(`room-${season2[0].id}`)).toBeVisible();
  // The warm-up is unlocked now, so it shows.
  await expect(page.getByTestId("daily-warmup")).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("sharing", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("'Share my score' copies the human-in-the-loop score and the site URL", async ({ page, baseURL }) => {
    await seedWithByteCatch(page);
    const score = page.getByTestId("hitl-score");
    await expect(score).toBeVisible();
    await score.getByTestId("share-score").click();
    await expect(score.getByTestId("share-score")).toContainText("Copied");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toMatch(/^I caught 1 of 1 of Byte's AI bugs on DevJourney/);
    expect(text).toContain(`${baseURL}/`);
  });

  test("the performance review shares a summary too", async ({ page }) => {
    await seedSolved(page, season1);
    await page.goto("/review/s01/");
    await page.getByTestId("review-copy").click();
    await expect(page.getByTestId("review-copy")).toContainText("Copied");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Your First Week");
    // Human concept names, not slugs.
    expect(text).toContain("Mutable shared data");
    expect(text).not.toContain("mutable-shared-data");
  });
});

test("onboarding is a real dialog: focus starts inside, Tab stays inside, Esc closes it", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByTestId("onboarding");
  await expect(dialog).toBeVisible();
  const cta = dialog.getByRole("button", { name: /Let's go/ });
  await expect(cta).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect((await readProgress(page)).onboarded).toBe(true);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("HQ fits 390px for a new and a returning player (warm-up included)", async ({ page }) => {
    await seedSolved(page, []);
    await expect(page.getByTestId("office-map").first()).toBeVisible();
    expect(await scrollWidth(page)).toBeLessThanOrEqual(390);

    await seedSolved(page, season1.slice(0, 5));
    await expect(page.getByTestId("today-card")).toBeVisible();
    await expect(page.getByTestId("daily-warmup")).toBeVisible();
    expect(await scrollWidth(page)).toBeLessThanOrEqual(390);

    // The warm-up session changes daily, so make the widest snippets in content/ the first
    // item: a warm-up missed 20 days ago is the one review due today.
    for (const w of widestWarmups.slice(0, 3)) {
      await page.evaluate(
        ({ key, id, after }) => {
          const p = JSON.parse(window.localStorage.getItem(key)!);
          const d = new Date();
          d.setDate(d.getDate() - 20);
          const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          p.warmupLog = [{ id, day, correct: false }];
          p.tickets[after] ??= { ...(Object.values(p.tickets)[0] as object) }; // its concept is unlocked
          window.localStorage.setItem(key, JSON.stringify(p));
        },
        { key: PROGRESS_KEY, id: w.id, after: w.after },
      );
      await page.reload();
      await expect(page.getByTestId("daily-warmup").locator("pre")).toContainText(w.code.trimEnd().split("\n")[0].trim());
      expect(await scrollWidth(page), `warm-up ${w.id} (${w.width} chars wide)`).toBeLessThanOrEqual(390);
    }

    await page.goto("/leaderboard/");
    await expect(page.getByTestId("leaderboard")).toBeVisible();
    expect(await scrollWidth(page)).toBeLessThanOrEqual(390);
    await page.goto("/skills/");
    await expect(page.getByTestId("skill-tree")).toBeVisible();
    expect(await scrollWidth(page)).toBeLessThanOrEqual(390);
  });
});
