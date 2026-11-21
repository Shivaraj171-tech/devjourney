import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { PROGRESS_KEY, seasonTickets, trackPageErrors } from "./helpers";

// From s01-t03 on: Byte calls on the tutorial tickets (s01-t01/t02) are practice and don't count.
const tickets = seasonTickets().slice(2);

type Student = {
  name: string;
  solved: number;
  /** Byte: "caught" = rejected a wrong suggestion, "waved" = accepted a wrong one and ran it. */
  byte: "caught" | "waved";
  baseline?: number;
  final?: number;
};

/** Seed a student's progress and make their class report code on /settings/. */
async function reportCode(page: Page, s: Student, classCode: string): Promise<string> {
  await page.goto("/");
  await page.evaluate(
    ({ key, ids, s }) => {
      const now = new Date().toISOString();
      const state: Record<string, unknown> = {};
      ids.forEach((id, i) => {
        state[id] = {
          code: { "app.py": "secret = 'never in a report'\n" }, runs: 1, hintsUsed: 0, solved: true, solvedAt: now, solveXp: 100,
          quizFirstPick: [], quizDone: true, quizFirstTryCorrect: 0, quizXp: 0,
          ...(i === 0 ? { byteSuggestion: { decision: s.byte === "caught" ? "reject" : "accept", correct: false, runsAtDecision: 0 } } : {}),
        };
      });
      const result = (score: number) => ({ score, total: 12, answers: {}, takenAt: now, ticketsSolved: 0 });
      const skillsCheck = {
        ...(s.baseline !== undefined ? { baseline: result(s.baseline) } : {}),
        ...(s.final !== undefined ? { final: result(s.final) } : {}),
      };
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, playerName: s.name, startedAt: now, activeDays: [now.slice(0, 10)], onboarded: true, skillsCheck, tickets: state }),
      );
    },
    { key: PROGRESS_KEY, ids: tickets.slice(0, s.solved).map((t) => t.id), s },
  );
  await page.goto("/settings/");
  await expect(page.getByTestId("report-name")).toHaveValue(s.name);
  await page.getByTestId("report-class").fill(classCode);
  await page.getByTestId("report-generate").click();
  const code = await page.getByTestId("report-code").inputValue();
  expect(code).toMatch(/^DJR1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
  expect(Buffer.from(code.split(".")[1], "base64url").toString()).not.toContain("secret");
  return code;
}

test("teacher pastes two report codes: table rows, averages, sorting and a CSV download", async ({ page }) => {
  const errors = trackPageErrors(page);
  const ana = await reportCode(page, { name: "Ana", solved: 3, byte: "caught", baseline: 5, final: 11 }, "cs1-blue");
  const ben = await reportCode(page, { name: "Ben", solved: 1, byte: "waved", baseline: 4 }, "CS1-BLUE");
  const other = await reportCode(page, { name: "Cy", solved: 2, byte: "caught" }, "OTHER");

  // A class report code is refused by the backup import.
  await page.getByTestId("restore-code").fill(ana);
  await page.getByTestId("restore-check").click();
  await expect(page.getByTestId("restore-error")).toContainText("class report code");

  // The settings page links to the teacher view (not in the main nav).
  await expect(page.getByRole("banner").getByRole("link", { name: /teacher/i })).toHaveCount(0);
  await page.getByTestId("teacher-link").click();
  await expect(page).toHaveURL(/\/teacher\/?$/);
  await expect(page.getByRole("heading", { name: /Teacher view/ })).toBeVisible();
  await expect(page.getByTestId("privacy-note")).toContainText("Nothing leaves this device");

  await page.getByTestId("teacher-class").fill("cs1-blue");
  await page.getByTestId("teacher-open").click();
  await expect(page.getByTestId("teacher-current-class")).toHaveText("CS1-BLUE");
  await expect(page.getByTestId("teacher-empty")).toBeVisible();

  await page.getByTestId("teacher-codes").fill(`Ana: ${ana}\n${ben}\n${other}\nnot a code`);
  await page.getByTestId("teacher-add").click();
  await expect(page.getByTestId("teacher-add-result")).toHaveText("2 added, 0 updated.");
  await expect(page.getByTestId("teacher-problems")).toContainText("Line 3: Cy's report is for class OTHER, not CS1-BLUE");
  await expect(page.getByTestId("teacher-problems")).toContainText("Line 4: No report code");

  const rows = page.getByTestId("teacher-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Ana");
  await expect(page.getByTestId("teacher-card")).toHaveCount(2);

  // Averages: (3 + 1) / 2 tickets, catch rate (100% + 0%) / 2, gain only from Ana (5 -> 11).
  await expect(page.getByTestId("avg-students")).toHaveText("2");
  await expect(page.getByTestId("avg-tickets")).toHaveText("2");
  await expect(page.getByTestId("avg-catch")).toHaveText("50%");
  await expect(page.getByTestId("avg-gain")).toHaveText("+6");
  await expect(page.getByTestId("avg-floor-s01")).toContainText("2/10");

  // Sorting: tickets descending, then ascending.
  await page.getByTestId("sort-tickets").click();
  await expect(rows.nth(0)).toContainText("Ana");
  await expect(page.locator("th[aria-sort=descending]")).toContainText("Tickets");
  await page.getByTestId("sort-tickets").click();
  await expect(rows.nth(0)).toContainText("Ben");
  await expect(page.locator("th[aria-sort=ascending]")).toContainText("Tickets");

  // Pasting the same code again doesn't duplicate the student.
  await page.getByTestId("teacher-codes").fill(ben);
  await page.getByTestId("teacher-add").click();
  await expect(page.getByTestId("teacher-add-result")).toHaveText("0 added, 0 updated, 1 already up to date.");
  await expect(rows).toHaveCount(2);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("teacher-csv").click()]);
  expect(download.suggestedFilename()).toMatch(/^devjourney-class-CS1-BLUE-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync((await download.path())!, "utf-8").trim().split(/\r?\n/);
  expect(csv).toHaveLength(3);
  expect(csv[0]).toMatch(/^Name,Class,Last active,Report date,XP,Tickets merged,Floor 1 merged,/);
  expect(csv[1]).toMatch(/^Ana,CS1-BLUE,\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2},\d+,3,3,/);
  expect(csv[2]).toMatch(/^Ben,CS1-BLUE,/);

  // Saved in this browser only: still there after a reload.
  await page.reload();
  await expect(page.getByTestId("teacher-current-class")).toHaveText("CS1-BLUE");
  await expect(page.getByTestId("teacher-row")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("teacher view fits a 390px phone and labels its controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const code = await reportCode(page, { name: "Ana", solved: 3, byte: "caught", baseline: 5, final: 11 }, "CS1");
  await page.goto("/teacher/");
  await page.getByTestId("teacher-class").fill("CS1");
  await page.getByTestId("teacher-open").click();
  await page.getByTestId("teacher-codes").fill(code);
  await page.getByTestId("teacher-add").click();
  await expect(page.getByTestId("teacher-row")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const id of ["teacher-class", "teacher-codes", "teacher-file"]) {
    await expect(page.getByTestId(id)).toHaveAccessibleName(/.+/);
  }
  // Sorting works from the keyboard.
  await page.getByTestId("sort-xp").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("th[aria-sort=descending]")).toContainText("XP");
});
