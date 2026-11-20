// Spaced, mixed daily warm-ups on the HQ: a session of up to 3, due reviews
// first with a reason for each item, a done state, and old saves still loading.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import { PROGRESS_KEY, readProgress, seasonTickets, seedSolved, trackPageErrors } from "./helpers";

type WarmupYaml = { id: string; concept: string; after: string; choices: string[]; answer: number };
const WARMUPS_DIR = join(__dirname, "..", "content", "warmups");
const warmups = new Map(
  readdirSync(WARMUPS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => load(readFileSync(join(WARMUPS_DIR, f), "utf-8")) as WarmupYaml)
    .map((w) => [w.id, w]),
);
const season1 = seasonTickets();

/** Local YYYY-MM-DD, `offset` days from today (in the browser's time zone). */
async function dayKey(page: Page, offset: number): Promise<string> {
  return page.evaluate((o) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, offset);
}

async function patchProgress(page: Page, patch: (p: Record<string, unknown>) => void) {
  const p = await readProgress(page);
  patch(p);
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), { key: PROGRESS_KEY, value: p });
  await page.reload();
}

/** Answer the warm-up on screen with its right choice; returns its id. */
async function answerCurrent(page: Page, right = true): Promise<string> {
  const item = page.getByTestId("warmup-item");
  const id = (await item.getAttribute("data-warmup-id"))!;
  const w = warmups.get(id)!;
  const choice = right ? w.answer : (w.answer + 1) % w.choices.length;
  await item.getByRole("button", { name: w.choices[choice], exact: true }).click();
  await expect(page.getByTestId("warmup-feedback")).toBeVisible();
  return id;
}

test("a session of 3: the missed one comes back first with its reason, mixed concepts, then a done state", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, season1.slice(0, 5));
  const threeDaysAgo = await dayKey(page, -3);
  const yesterday = await dayKey(page, -1);
  await patchProgress(page, (p) => {
    p.warmupLog = [{ id: "w001", day: threeDaysAgo, correct: false }];
    // A quiz question on ticket 3 was missed yesterday.
    const t = (p.tickets as Record<string, Record<string, unknown>>)[season1[2].id];
    t.solvedAt = `${yesterday}T12:00:00`;
    t.quizFirstPick = [0, 0];
    t.quizFirstTryCorrect = 1;
  });

  const card = page.getByTestId("daily-warmup");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("today-warmup")).toContainText("Ready");
  await expect(card.getByTestId("warmup-progress")).toHaveText("1 of 3");
  await expect(card.getByTestId("warmup-item")).toHaveAttribute("data-warmup-id", "w001");
  await expect(card.getByTestId("warmup-reason")).toHaveText("Review: you missed this 3 days ago");

  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    await expect(card.getByTestId("warmup-progress")).toHaveText(`${i + 1} of 3`);
    if (i === 1) await expect(card.getByTestId("warmup-reason")).toHaveText(/^Practice: you missed a quiz question on .+ yesterday$/);
    seen.push(await answerCurrent(page, i !== 2));
    await expect(card.getByTestId("warmup-next")).toHaveText(i === 2 ? "Finish warm-up" : /Next question/);
    await card.getByTestId("warmup-next").click();
  }

  // Interleaved: three different concepts, all unlocked by the solved tickets.
  const solved = new Set(season1.slice(0, 5).map((t) => t.id));
  expect(new Set(seen.map((id) => warmups.get(id)!.concept)).size).toBe(3);
  expect(seen.every((id) => solved.has(warmups.get(id)!.after))).toBe(true);

  const done = card.getByTestId("warmup-done");
  await expect(done).toContainText("2 of 3 right first try (+20 XP)");
  await expect(done).toContainText("Next review: tomorrow");
  await expect(page.getByTestId("today-warmup")).toContainText("Done");

  const progress = await readProgress(page);
  const today = await dayKey(page, 0);
  expect(progress.warmupLog.filter((a: { day: string }) => a.day === today)).toEqual([
    { id: seen[0], day: today, correct: true },
    { id: seen[1], day: today, correct: true },
    { id: seen[2], day: today, correct: false },
  ]);
  expect(progress.activeDays).toContain(today); // keeps the streak

  // Still done after a reload.
  await page.reload();
  await expect(page.getByTestId("warmup-done")).toBeVisible();
  expect(errors).toEqual([]);
});

test("old one-a-day saves still load: yesterday's miss is today's first review", async ({ page }) => {
  await seedSolved(page, season1.slice(0, 3));
  const yesterday = await dayKey(page, -1);
  const lastWeek = await dayKey(page, -7);
  await patchProgress(page, (p) => {
    p.warmups = { [lastWeek]: { id: "w002", correct: true }, [yesterday]: { id: "w001", correct: false } };
  });
  const card = page.getByTestId("daily-warmup");
  await expect(card.getByTestId("warmup-item")).toHaveAttribute("data-warmup-id", "w001");
  await expect(card.getByTestId("warmup-reason")).toHaveText("Review: you missed this yesterday");
  await answerCurrent(page);

  const progress = await readProgress(page);
  expect(progress.warmups).toBeUndefined();
  expect(progress.warmupLog.slice(0, 2)).toEqual([
    { id: "w002", day: lastWeek, correct: true },
    { id: "w001", day: yesterday, correct: false },
  ]);
});
