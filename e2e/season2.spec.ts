// Season 2 ("Week Two: The AI Pair"): review tickets (flag lines in Byte's PR),
// bug/feature tickets and a timed incident, played in order in one context.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import {
  answerQuiz,
  openQuizTab,
  readProgress,
  runTests,
  seasonTickets,
  seedSolved,
  setEditorFile,
  solutionFile,
  ticketUrl,
  trackPageErrors,
  waitForPython,
  type TicketInfo,
} from "./helpers";

const season1 = seasonTickets();
const season2 = seasonTickets("s02-week-two");

type ReviewYaml = { files: string[]; issues: { file: string; line: number; also_lines?: number[] }[] };

function reviewOf(t: TicketInfo): ReviewYaml {
  return load(readFileSync(join(t.dir, "review.yaml"), "utf-8")) as ReviewYaml;
}

/** First non-blank line of a PR file that isn't part of any issue: a guaranteed false alarm. */
function falseAlarmLine(t: TicketInfo, review: ReviewYaml): { file: string; line: number } {
  const file = review.files[0];
  const issueLines = new Set(
    review.issues.filter((i) => i.file === file).flatMap((i) => [i.line, ...(i.also_lines ?? [])]),
  );
  const lines = readFileSync(join(t.dir, "pr", file), "utf-8").split("\n");
  const idx = lines.findIndex((l, i) => l.trim() !== "" && !issueLines.has(i + 1));
  return { file, line: idx + 1 };
}

const reviewPanel = (page: Page) => page.getByTestId("review-panel");

async function openPrFile(page: Page, path: string) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await reviewPanel(page).getByRole("button", { name: new RegExp(`(^|\\s)${escaped}$`) }).click();
  await expect(page.getByTestId("pr-file")).toBeVisible();
}

const lineButton = (page: Page, line: number) => page.getByTestId("pr-file").locator(`button[data-line="${line}"]`);

async function closeModal(page: Page, title: string | RegExp) {
  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(title);
  await modal.getByRole("button", { name: "Stay here" }).click();
  await expect(modal).toHaveCount(0);
}

async function playReview(page: Page, t: TicketInfo, tryFalseAlarm: boolean) {
  const review = reviewOf(t);
  await expect(reviewPanel(page)).toBeVisible();
  await expect(page.getByTestId("run-tests")).toHaveCount(0);
  await expect(page.getByTestId("submit-review")).toBeDisabled();

  if (tryFalseAlarm) {
    const fa = falseAlarmLine(t, review);
    await openPrFile(page, fa.file);
    await lineButton(page, fa.line).click();
    await expect(lineButton(page, fa.line)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("flag-count")).toContainText("1 line flagged");
    await page.getByTestId("submit-review").click();
    const verdict = page.getByTestId("review-verdict");
    await expect(verdict).toContainText(`You found 0 of ${review.issues.length}`);
    await expect(verdict).toContainText("false alarm");
    await expect(lineButton(page, fa.line)).toHaveAttribute("aria-label", /false alarm/);
    await expect(page.getByText(/False alarm: this line looks fine \(−10 XP\)/)).toBeVisible();
    await expect(page.getByTestId("solved-modal")).toHaveCount(0);
    // Unflag it before flagging the real problems.
    await lineButton(page, fa.line).click();
    await expect(lineButton(page, fa.line)).toHaveAttribute("aria-pressed", "false");
  }

  for (const issue of review.issues) {
    await openPrFile(page, issue.file);
    await lineButton(page, issue.line).click();
    await expect(lineButton(page, issue.line)).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.getByTestId("flag-count")).toContainText(`${review.issues.length} line`);
  await page.getByTestId("submit-review").click();

  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Review submitted!");
  if (tryFalseAlarm) {
    await expect(modal).toContainText("False alarms");
    await expect(modal).toContainText("−10");
    await expect(modal).toContainText("+140 XP"); // junior base 150 − one false alarm
  } else {
    await expect(modal).not.toContainText("False alarms");
    await expect(modal).toContainText("+150 XP");
  }
  await closeModal(page, "Review submitted!");
  await expect(page.getByTestId("review-verdict")).toContainText("Review complete");
  await expect(page.getByTestId("submit-review")).toHaveCount(0);
}

async function playCode(page: Page, t: TicketInfo) {
  const isIncident = t.type === "incident";
  if (isIncident) {
    const panel = page.getByTestId("incident-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Production incident");
    const logs = page.getByTestId("incident-logs");
    await expect(logs).toBeVisible();
    const firstLog = readFileSync(join(t.dir, "logs.txt"), "utf-8").split("\n")[0].trim();
    await expect(logs).toContainText(firstLog);
    await expect(logs).toContainText("Traceback");
    const timer = page.getByTestId("incident-timer");
    await expect(timer).toHaveText(/^\d\d:\d\d$/);
    // The countdown actually ticks.
    const first = await timer.textContent();
    await expect(timer).not.toHaveText(first!, { timeout: 5_000 });
  }

  await waitForPython(page);
  await runTests(page);
  await expect(page.getByTestId("run-error")).toHaveCount(0);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  await expect(page.getByTestId("solved-modal")).toHaveCount(0);

  for (const path of t.filesEditable) {
    await setEditorFile(page, t.id, path, solutionFile(t, path));
  }
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");

  if (isIncident) {
    const modal = page.getByTestId("solved-modal");
    await expect(modal).toContainText("Incident resolved!");
    await expect(modal).toContainText("⚡ Speed bonus");
    await expect(modal).toContainText("+50");
    await closeModal(page, "Incident resolved!");
    await expect(page.getByTestId("incident-panel")).toContainText("Incident resolved");
    await expect(page.getByTestId("incident-status")).toContainText("speed bonus +50 XP");
  } else {
    await closeModal(page, "PR merged!");
  }
}

test("every Season 2 ticket can be played in the browser", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const errors = trackPageErrors(page);
  await seedSolved(page, season1);

  // Floor 2 is open and its first room is the next one up.
  await expect(page.getByTestId(`room-${season2[0].id}`)).toHaveAttribute("data-state", "open");
  for (const t of season2.slice(1)) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "locked");
  }

  let firstReview = true;
  for (const t of season2) {
    await test.step(`${t.id} (${t.type})`, async () => {
      await page.goto(ticketUrl(t.id));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/still in the backlog/)).toHaveCount(0);

      if (t.type === "review") {
        expect(existsSync(join(t.dir, "review.yaml"))).toBe(true);
        await playReview(page, t, firstReview);
        firstReview = false;
      } else {
        await playCode(page, t);
      }

      if (t.questions.length > 0) {
        await openQuizTab(page);
        await answerQuiz(page, t.questions);
        await expect(page.getByTestId("quiz-done")).toContainText(`${t.questions.length}/${t.questions.length}`);
      }

      const p = await readProgress(page);
      expect(p.tickets[t.id].solved, `${t.id} solved`).toBe(true);
      if (t.questions.length > 0) expect(p.tickets[t.id].quizDone, `${t.id} quiz done`).toBe(true);
    });
  }

  await page.goto("/");
  const all = [...season1, ...season2];
  await expect(page.locator("[data-testid^=room-]")).toHaveCount(all.length);
  for (const t of all) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  }
  await page.screenshot({ path: "test-results/e2e/hq-season2-complete.png", fullPage: true });
  expect(errors).toEqual([]);
});

test.describe("phone viewport", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("a review ticket has no horizontal overflow", async ({ page }) => {
    await seedSolved(page, season1);
    const t = season2.find((x) => x.type === "review")!;
    await page.goto(ticketUrl(t.id));
    await expect(page.getByTestId("review-panel")).toBeVisible();
    await expect(page.getByTestId("pr-file")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const submit = page.getByTestId("submit-review");
    await submit.scrollIntoViewIfNeeded();
    const box = await submit.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "test-results/e2e/mobile-review.png", fullPage: true });
  });
});
