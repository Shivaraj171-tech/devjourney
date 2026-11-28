// Playing whole tickets like a learner: code tickets (starter fails, solution
// passes), review tickets (flag the lines from review.yaml) and incidents.
// Ticket data is read from content/ on disk.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, type Page } from "@playwright/test";
import {
  answerQuiz,
  openQuizTab,
  readProgress,
  runTests,
  setEditorFile,
  solutionFile,
  ticketUrl,
  waitForPython,
  type TicketInfo,
} from "./helpers";

export type ReviewIssue = { file: string; line: number; also_lines?: number[] };
export type ReviewYaml = { files: string[]; issues: ReviewIssue[] };

export function reviewOf(t: TicketInfo): ReviewYaml {
  return load(readFileSync(join(t.dir, "review.yaml"), "utf-8")) as ReviewYaml;
}

const BASE_XP: Record<string, number> = { intern: 100, junior: 150, mid: 200, senior: 300 };
const FALSE_ALARM_COST = 10;

/** First non-blank line of a PR file that isn't part of any issue: a guaranteed false alarm. */
export function falseAlarmLine(t: TicketInfo, review: ReviewYaml): { file: string; line: number } {
  const file = review.files[0];
  const issueLines = new Set(review.issues.filter((i) => i.file === file).flatMap((i) => [i.line, ...(i.also_lines ?? [])]));
  const lines = readFileSync(join(t.dir, "pr", file), "utf-8").split("\n");
  return { file, line: lines.findIndex((l, i) => l.trim() !== "" && !issueLines.has(i + 1)) + 1 };
}

const reviewPanel = (page: Page) => page.getByTestId("review-panel");
const lineButton = (page: Page, line: number) => page.getByTestId("pr-file").locator(`button[data-line="${line}"]`);

async function openPrFile(page: Page, path: string) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await reviewPanel(page).getByRole("button", { name: new RegExp(`(^|\\s)${escaped}$`) }).click();
  await expect(page.getByTestId("pr-file")).toBeVisible();
}

export async function closeSolvedModal(page: Page, title: string | RegExp) {
  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(title);
  await modal.getByRole("button", { name: "Stay here" }).click();
  await expect(modal).toHaveCount(0);
}

type ReviewOptions = {
  /** Flag and submit one clean line first, and check the false-alarm feedback and penalty. */
  tryFalseAlarm?: boolean;
  /** For issues with also_lines, flag the first also_line instead of the main line. */
  useAlsoLines?: boolean;
};

export async function playReview(page: Page, t: TicketInfo, opts: ReviewOptions = {}) {
  const review = reviewOf(t);
  const base = BASE_XP[t.level];
  await expect(reviewPanel(page)).toBeVisible();
  await expect(page.getByTestId("run-tests")).toHaveCount(0);
  await expect(page.getByTestId("submit-review")).toBeDisabled();

  if (opts.tryFalseAlarm) {
    const fa = falseAlarmLine(t, review);
    await openPrFile(page, fa.file);
    await lineButton(page, fa.line).click();
    await expect(lineButton(page, fa.line)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("flag-count")).toContainText("1 line flagged");
    await page.getByTestId("submit-review").click();
    const verdict = page.getByTestId("review-verdict");
    await expect(verdict).toContainText(`You found 0 of ${review.issues.length}`);
    await expect(verdict).toContainText("false alarm");
    await expect(lineButton(page, fa.line)).toHaveAccessibleName(/false alarm/);
    await expect(page.getByText(new RegExp(`False alarm: this line looks fine \\(−${FALSE_ALARM_COST} XP\\)`))).toBeVisible();
    await expect(page.getByTestId("solved-modal")).toHaveCount(0);
    await lineButton(page, fa.line).click();
    await expect(lineButton(page, fa.line)).toHaveAttribute("aria-pressed", "false");
  }

  for (const issue of review.issues) {
    const line = opts.useAlsoLines && issue.also_lines?.length ? issue.also_lines[0] : issue.line;
    await openPrFile(page, issue.file);
    await lineButton(page, line).click();
    await expect(lineButton(page, line)).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.getByTestId("flag-count")).toContainText(`${review.issues.length} line`);
  await page.getByTestId("submit-review").click();

  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Review submitted");
  if (opts.tryFalseAlarm) {
    await expect(modal).toContainText("False alarms");
    await expect(modal).toContainText(`+${base - FALSE_ALARM_COST} XP`);
  } else {
    await expect(modal).not.toContainText("False alarms");
    await expect(modal).toContainText(`+${base} XP`);
  }
  await closeSolvedModal(page, "Review submitted");
  await expect(page.getByTestId("review-verdict")).toContainText("Review complete");
  await expect(page.getByTestId("submit-review")).toHaveCount(0);
  // Every issue is revealed as a real problem on its main line once the review is done.
  for (const issue of review.issues) {
    await openPrFile(page, issue.file);
    await expect(lineButton(page, issue.line)).toHaveAccessibleName(/real problem/);
  }
}

export async function playCode(page: Page, t: TicketInfo) {
  const isIncident = t.type === "incident";
  if (isIncident) {
    const panel = page.getByTestId("incident-panel");
    await expect(panel).toContainText("Production incident");
    const logs = page.getByTestId("incident-logs");
    const firstLog = readFileSync(join(t.dir, "logs.txt"), "utf-8").split("\n")[0].trim();
    await expect(logs).toContainText(firstLog);
    const timer = page.getByTestId("incident-timer");
    await expect(timer).toHaveText(/^\d\d:\d\d$/);
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
  await expect(page.getByTestId("run-error")).toHaveCount(0);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");

  if (isIncident) {
    const modal = page.getByTestId("solved-modal");
    await expect(modal).toContainText("Speed bonus");
    await closeSolvedModal(page, "Incident resolved");
    await expect(page.getByTestId("incident-panel")).toContainText("Incident resolved");
    await expect(page.getByTestId("incident-status")).toContainText("speed bonus +");
  } else {
    await closeSolvedModal(page, "PR merged");
  }
}

/** Open a ticket, play it according to its type, take the quiz, and check progress. */
export async function playTicket(page: Page, t: TicketInfo, reviewOpts: ReviewOptions = {}) {
  await page.goto(ticketUrl(t.id));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/still in the backlog/)).toHaveCount(0);

  if (t.type === "review") await playReview(page, t, reviewOpts);
  else if (t.type === "read") {
    await openQuizTab(page);
  } else await playCode(page, t);

  if (t.questions.length > 0) {
    await openQuizTab(page);
    await answerQuiz(page, t.questions);
    if (t.type === "read") await closeSolvedModal(page, "Ticket closed");
    await expect(page.getByTestId("quiz-done")).toContainText(`${t.questions.length}/${t.questions.length}`);
  }

  const p = await readProgress(page);
  expect(p.tickets[t.id].solved, `${t.id} solved`).toBe(true);
  if (t.questions.length > 0) expect(p.tickets[t.id].quizDone, `${t.id} quiz done`).toBe(true);
}
