import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { PROGRESS_KEY, readProgress, seasonTickets, trackPageErrors } from "./helpers";

const tickets = seasonTickets();
const DAY = 86_400_000;

/** Write a progress save straight into localStorage (then reload to pick it up). */
async function seed(page: Page, opts: { name?: string; solved: number; startedDaysAgo?: number }) {
  await page.goto("/");
  await page.evaluate(
    ({ key, ids, name, startedAt }) => {
      const now = new Date().toISOString();
      const state: Record<string, unknown> = {};
      for (const id of ids) {
        state[id] = { code: { "app.py": "print('hi')\n" }, runs: 1, hintsUsed: 0, solved: true, solvedAt: now, solveXp: 100, quizFirstPick: [], quizDone: true, quizFirstTryCorrect: 0, quizXp: 0 };
      }
      window.localStorage.setItem(key, JSON.stringify({ version: 1, playerName: name, startedAt, activeDays: [now.slice(0, 10)], onboarded: true, tickets: state }));
    },
    {
      key: PROGRESS_KEY,
      ids: tickets.slice(0, opts.solved).map((t) => t.id),
      name: opts.name ?? "You",
      startedAt: new Date(Date.now() - (opts.startedDaysAgo ?? 0) * DAY).toISOString(),
    },
  );
  await page.reload();
}

test("export a backup code, reset, import it: progress is back", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seed(page, { name: "Ana", solved: 3 });

  // The top bar's gear opens the settings page.
  await page.getByTestId("settings-link").click();
  await expect(page).toHaveURL(/\/settings\/?$/);
  await expect(page.getByRole("heading", { name: /Settings & backup/ })).toBeVisible();
  await expect(page.getByTestId("settings-summary")).toContainText("Ana · 3 tickets merged");

  await page.getByTestId("backup-show-code").click();
  const code = await page.getByTestId("backup-code").inputValue();
  expect(code).toMatch(/^DJB1\.[zj]\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);

  // Reset needs the typed confirmation.
  await expect(page.getByTestId("reset-button")).toBeDisabled();
  await page.getByTestId("reset-input").fill("reset");
  await expect(page.getByTestId("reset-button")).toBeDisabled();
  await page.getByTestId("reset-input").fill("RESET");
  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("reset-done")).toContainText("Progress reset");
  await expect(page.getByTestId("settings-summary")).toContainText("0 tickets merged");
  expect(Object.keys((await readProgress(page)).tickets)).toHaveLength(0);

  // Import: preview first, nothing changes until confirmed.
  await page.getByTestId("restore-code").fill(code);
  await page.getByTestId("restore-check").click();
  await expect(page.getByTestId("restore-preview")).toBeFocused();
  await expect(page.getByTestId("restore-preview")).toContainText("Backup found for Ana");
  await expect(page.getByTestId("restore-preview-line")).toHaveText(/^3 tickets merged, \d+ XP, saved today$/);
  expect(Object.keys((await readProgress(page)).tickets)).toHaveLength(0);
  await page.getByTestId("restore-confirm").click();
  await expect(page.getByTestId("restore-done")).toContainText("Welcome back, Ana");

  const restored = await readProgress(page);
  expect(restored.playerName).toBe("Ana");
  expect(Object.values(restored.tickets).filter((t) => (t as { solved: boolean }).solved)).toHaveLength(3);
  await expect(page.getByTestId("settings-summary")).toContainText("Ana · 3 tickets merged");

  await page.goto("/");
  for (const t of tickets.slice(0, 3)) await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  expect(errors).toEqual([]);
});

test("bad backup codes are rejected with a clear message and change nothing", async ({ page }) => {
  await seed(page, { name: "Ana", solved: 2 });
  await page.goto("/settings/");
  await page.getByTestId("backup-show-code").click();
  const code = await page.getByTestId("backup-code").inputValue();

  const tryCode = async (text: string, message: RegExp) => {
    await page.getByTestId("restore-code").fill(text);
    await page.getByTestId("restore-check").click();
    await expect(page.getByTestId("restore-error")).toHaveText(message);
    await expect(page.getByTestId("restore-preview")).toHaveCount(0);
  };
  await tryCode("hello there", /doesn't look like a DevJourney backup/);
  await tryCode(code.slice(0, -14) + code.slice(-9), /damaged or incomplete/);
  await tryCode(code.split(".").slice(0, 3).join("."), /cut off/);
  await tryCode("DJR1.eyJ2IjoxfQ.12345678", /class report code/);
  await expect(page.getByTestId("restore-code")).toHaveAttribute("aria-invalid", "true");

  expect(Object.keys((await readProgress(page)).tickets)).toHaveLength(2);
});

test("a backup file downloads, and an old-format save file imports", async ({ page }) => {
  await seed(page, { name: "Ana", solved: 1 });
  await page.goto("/settings/");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("backup-download").click()]);
  expect(download.suggestedFilename()).toMatch(/^devjourney-progress-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(readFileSync((await download.path())!, "utf-8"));
  expect(file).toMatchObject({ app: "devjourney", kind: "progress-backup", format: 1 });
  expect(file.checksum).toMatch(/^[0-9a-f]{8}$/);
  await expect(page.getByTestId("backup-last")).toContainText("Last backup from this browser: today");

  // A raw save from an older version: no onboarded/skillsCheck/warmupLog, old one-a-day
  // warm-ups, and tickets missing fields added later.
  const old = {
    version: 1,
    playerName: "Old Timer",
    startedAt: "2026-01-05T10:00:00.000Z",
    activeDays: ["2026-01-05", "2026-01-06"],
    warmups: { "2026-01-06": { id: "w-strings-1", correct: true } },
    tickets: Object.fromEntries(
      tickets.slice(0, 4).map((t) => [t.id, { code: {}, runs: 2, hintsUsed: 0, solved: true, solveXp: 100, quizFirstPick: [], quizDone: true, quizXp: 0 }]),
    ),
  };
  await page.getByTestId("restore-file").setInputFiles({ name: "old-save.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(old)) });
  await expect(page.getByTestId("restore-preview")).toContainText("Backup found for Old Timer");
  await expect(page.getByTestId("restore-preview-line")).toHaveText(/^4 tickets merged, \d+ XP$/);
  await page.getByTestId("restore-confirm").click();
  await expect(page.getByTestId("restore-done")).toBeVisible();

  const p = await readProgress(page);
  expect(p.playerName).toBe("Old Timer");
  expect(p.tickets[tickets[0].id].quizFirstTryCorrect).toBe(0);
  expect(p.warmups).toBeUndefined(); // migrated by the store
  expect(p.warmupLog).toEqual([{ id: "w-strings-1", day: "2026-01-06", correct: true }]);
});

test("backup reminder: shows after 7 days without a backup, dismisses, and goes away after a backup", async ({ page }) => {
  // A new learner sees no reminder.
  await seed(page, { solved: 1, startedDaysAgo: 1 });
  await expect(page.getByTestId("today-card")).toBeVisible();
  await expect(page.getByTestId("backup-reminder")).toHaveCount(0);

  // 10 days in, never backed up: the reminder shows; "Not now" hides it, also after a reload.
  await seed(page, { solved: 2, startedDaysAgo: 10 });
  await expect(page.getByTestId("backup-reminder")).toBeVisible();
  await expect(page.getByTestId("backup-reminder")).toContainText("2 merged tickets live only in this browser");
  await page.getByTestId("backup-reminder-dismiss").click();
  await expect(page.getByTestId("backup-reminder")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("today-card")).toBeVisible();
  await expect(page.getByTestId("backup-reminder")).toHaveCount(0);

  // Without the dismissal, "Back up now" leads to settings; a backup clears the reminder.
  await page.evaluate(() => window.localStorage.removeItem("devjourney:backup:v1"));
  await page.reload();
  await page.getByTestId("backup-reminder-go").click();
  await expect(page).toHaveURL(/\/settings\/?$/);
  await page.getByTestId("backup-show-code").click();
  await page.getByTestId("backup-copy").click();
  await expect(page.getByTestId("backup-last")).toContainText("today");
  await page.goto("/");
  await expect(page.getByTestId("today-card")).toBeVisible();
  await expect(page.getByTestId("backup-reminder")).toHaveCount(0);
});

test("settings fits a 390px phone with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, { name: "Ana", solved: 2 });
  await page.goto("/settings/");
  await page.getByTestId("backup-show-code").click();
  await page.getByTestId("report-class").fill("CS1");
  await page.getByTestId("report-generate").click();
  await expect(page.getByTestId("report-code")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // Every form control has an accessible name.
  for (const id of ["restore-file", "restore-code", "report-name", "report-class", "reset-input", "backup-code", "report-code"]) {
    await expect(page.getByTestId(id)).toHaveAccessibleName(/.+/);
  }
});
