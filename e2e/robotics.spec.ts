// The Robotics Lab (content/seasons/s40-robotics-lab): a side floor that opens as a
// whole once Season 1 is done, with the 🔭 Lab viewer drawing what each run did
// (`from lab import viz`, lib/runner/lab.py -> components/LabViewer.tsx).
// Every ticket is played: starter fails, solution passes, the viewer renders, the quiz.
// It must never block anything: the final exam stays gated on the last on-chain season.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  allSeasonTickets,
  answerQuiz,
  bountyTickets,
  openQuizTab,
  readProgress,
  runTests,
  seasonTickets,
  seedSolved,
  setEditorFile,
  sideFloor,
  solutionFile,
  ticketUrl,
  trackPageErrors,
  waitForPython,
  type TicketInfo,
} from "./helpers";
import { closeSolvedModal } from "./play";

const lab = sideFloor("s40-robotics-lab");
const season1 = seasonTickets("s01-first-week");
const onChain = allSeasonTickets();

const SHOTS = process.env.ROBOTICS_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

/** What each ticket's tests draw (the same on the starter and the solution). */
const DRAWS: Record<string, { arm: number; chart: number; grid: number; points: number }> = {
  "s40-t01": { arm: 2, chart: 0, grid: 0, points: 0 },
  "s40-t02": { arm: 1, chart: 0, grid: 0, points: 0 },
  "s40-t03": { arm: 1, chart: 0, grid: 0, points: 0 },
  "s40-t04": { arm: 1, chart: 2, grid: 0, points: 0 },
  "s40-t05": { arm: 1, chart: 1, grid: 0, points: 0 },
  "s40-t06": { arm: 1, chart: 1, grid: 1, points: 0 },
  "s40-t07": { arm: 0, chart: 1, grid: 0, points: 2 },
  "s40-t08": { arm: 1, chart: 1, grid: 0, points: 0 },
};

async function expectDrawings(page: Page, id: string, solved = true) {
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible();
  for (const [kind, count] of Object.entries(DRAWS[id])) await expect(viewer.getByTestId(`lab-${kind}`)).toHaveCount(count);
  // Every arm has frames to scrub through, every chart at least one line, each with a text summary.
  for (const arm of await viewer.getByTestId("lab-arm").all()) {
    await expect(arm.getByTestId("lab-slider")).toHaveAttribute("max", /^[1-9]\d*$/);
    await expect(arm.getByTestId("lab-arm-summary")).toContainText("gripper at (");
  }
  for (const chart of await viewer.getByTestId("lab-chart").all()) {
    // (A starter's loss can be all inf/nan: no line to draw, the summary says so.)
    if (solved) await expect(chart.locator("[data-testid=lab-line]").first()).toBeAttached();
    await expect(chart.getByTestId("lab-chart-summary")).not.toBeEmpty();
  }
}

test("content: 8 lesson tickets on a side floor opened by the end of Season 1", () => {
  expect(lab.requires).toBe("s01-t10");
  expect(lab.tickets).toHaveLength(8);
  const ids = new Set(lab.tickets.map((t) => t.id));
  expect(onChain.some((t) => ids.has(t.id))).toBe(false); // not part of the story
  expect(bountyTickets().some((t) => ids.has(t.id))).toBe(false); // not on the bounty board
  for (const t of lab.tickets) expect(t.questions.length).toBeGreaterThanOrEqual(2);
});

test("HQ: the lab is locked until Season 1 is done, then opens; it never blocks the final exam", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, season1.slice(0, 9));
  await page.goto("/");
  const floor = page.getByTestId("side-floor-s40");
  await expect(floor).toBeVisible();
  await expect(floor).toHaveAttribute("data-state", "locked");
  await expect(floor.getByRole("heading").first()).toContainText("🤖 Robotics Lab");
  await expect(floor).toContainText("8 tickets · 🔒 opens after Floor 1");
  await expect(floor.locator("[data-testid^=lab-room-]")).toHaveCount(8);
  // The story floors are unchanged: rooms only for on-chain tickets.
  await expect(page.locator("[data-testid^=room-]")).toHaveCount(onChain.length);
  // A locked lab ticket says why.
  await page.goto(ticketUrl("s40-t01"));
  await expect(page.getByText(/still in the backlog/)).toBeVisible();
  await expect(page.getByText("The Robotics Lab opens once you've finished the floor it builds on.")).toBeVisible();

  await seedSolved(page, season1);
  await page.goto("/");
  await expect(floor).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s40-t01")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s40-t02")).toHaveAttribute("data-state", "locked");
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "locked");
  await floor.getByRole("button", { name: /Robotics Lab/ }).click(); // unfold it
  await expect(floor).toHaveAttribute("data-expanded", "true");
  await floor.screenshot({ path: join(SHOTS, "robotics-hq-floor.png") });

  // Every on-chain season done, no lab ticket solved: the final exam opens anyway.
  await seedSolved(page, onChain);
  await page.goto("/");
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s40-t01")).toHaveAttribute("data-state", "open");
  expect(errors).toEqual([]);
});

test("HQ: a finished lab shows 8/8 merged, with no performance review link (that's for story floors)", async ({ page }) => {
  await seedSolved(page, [...season1, ...lab.tickets]);
  await page.goto("/");
  const floor = page.getByTestId("side-floor-s40");
  await expect(floor).toContainText("✅ 8/8 merged");
  await expect(floor.locator("[data-testid^=lab-room-][data-state=done]")).toHaveCount(8);
  await expect(page.getByTestId("review-link-s40")).toHaveCount(0);
});

for (const [i, t] of lab.tickets.entries()) {
  test(`plays ${t.id}: starter fails, solution passes, the Lab viewer draws it, quiz`, async ({ page }) => {
    const errors = trackPageErrors(page);
    await seedSolved(page, [...season1, ...lab.tickets.slice(0, i)]);
    await page.goto(ticketUrl(t.id));
    await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
    await expect(page.getByTestId("side-floor-chip")).toContainText("🤖 Robotics Lab");
    await waitForPython(page);
    await expect(page.getByTestId("lab-viewer")).toHaveCount(0); // nothing drawn before the first run

    // Starter: fails, but the viewer already shows what the buggy code does.
    await runTests(page);
    await expect(page.getByTestId("run-error")).toHaveCount(0);
    await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
    await expectDrawings(page, t.id, false);
    if (t.id === "s40-t08") await expect(page.getByTestId("lab-chart-summary")).toContainText("blew up");
    if (t.id === "s40-t01") await expect(page.getByTestId("lab-ghost").first()).toBeAttached();

    for (const path of t.filesEditable) await setEditorFile(page, t.id, path, solutionFile(t, path));
    await runTests(page);
    await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
    await closeSolvedModal(page, t.type === "incident" ? "Incident resolved!" : "PR merged!");
    await expectDrawings(page, t.id);
    await checkTicketSpecifics(page, t);

    await openQuizTab(page);
    await answerQuiz(page, t.questions);
    await expect(page.getByTestId("quiz-done")).toContainText(`${t.questions.length}/${t.questions.length}`);
    const p = await readProgress(page);
    expect(p.tickets[t.id].solved).toBe(true);
    expect(errors).toEqual([]);
  });
}

/** A desktop screenshot of the whole viewer (a taller window, so the checks panel has room for it). */
async function shotViewer(page: Page, name: string) {
  await page.setViewportSize({ width: 1440, height: 1500 });
  const viewer = page.getByTestId("lab-viewer");
  await viewer.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, `${name}-page.png`) });
  await viewer.screenshot({ path: join(SHOTS, `${name}-viewer.png`) });
  await page.setViewportSize({ width: 1440, height: 900 });
}

/** What the solved ticket's drawing must show. */
async function checkTicketSpecifics(page: Page, t: TicketInfo) {
  const arm = page.getByTestId("lab-arm").first();
  if (t.id === "s40-t01") {
    // The arm plays to its last frame; then the cross (forward()) sits on the real gripper.
    await expect(arm.getByTestId("lab-arm-summary")).toContainText("gripper at (0.00, 1.80)", { timeout: 10_000 });
    await expect(arm.getByTestId("lab-arm-summary")).toContainText("your code says (0.00, 1.80)");
    // Keyboard: the slider moves the arm.
    const slider = arm.getByTestId("lab-slider");
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(arm.getByTestId("lab-arm-svg")).toHaveAttribute("data-frame", "0");
    await expect(arm.getByTestId("lab-arm-summary")).toContainText("Frame 1 of 31");
    await page.keyboard.press("End");
    await expect(arm.getByTestId("lab-arm-svg")).toHaveAttribute("data-frame", "30");
    // Replay from the start.
    await arm.getByTestId("lab-play").click();
    await expect(arm.getByTestId("lab-arm-svg")).not.toHaveAttribute("data-frame", "30");
    await expect(arm.getByTestId("lab-arm-svg")).toHaveAttribute("data-frame", "30", { timeout: 10_000 });
    await expect(arm.getByTestId("lab-workspace")).toHaveAttribute("data-shape", "ring");
    await shotViewer(page, "robotics-t01-desktop");
  }
  if (t.id === "s40-t02") {
    // Every box on the shelf is reached: the last frame lands on the last target.
    await expect(arm.getByTestId("lab-arm-summary")).toContainText("0.000 away", { timeout: 10_000 });
    await expect(arm.getByTestId("lab-target")).toBeAttached();
  }
  if (t.id === "s40-t03") {
    await expect(arm.getByTestId("lab-workspace")).toHaveAttribute("data-shape", "limits");
    await shotViewer(page, "robotics-t03-limits-desktop");
  }
  if (t.id === "s40-t04") {
    await expect(page.getByTestId("lab-hline")).toHaveCount(1);
    await expect(page.getByTestId("lab-chart").first()).toContainText("shoulder");
    await shotViewer(page, "robotics-t04-desktop");
  }
  if (t.id === "s40-t05") {
    await expect(page.getByTestId("lab-chart-summary")).toContainText("Shoulder angle: shoulder rises from");
    await expect(page.getByTestId("lab-arm-svg")).toHaveAttribute("data-frame", "99", { timeout: 10_000 }); // played to the end
    await shotViewer(page, "robotics-t05-pid-desktop");
  }
  if (t.id === "s40-t06") {
    await expect(page.getByTestId("lab-grid-summary")).toContainText("reaches the goal");
    await expect(page.getByTestId("lab-chart").getByText("average of the last 10", { exact: true })).toBeVisible();
    await shotViewer(page, "robotics-t06-qlearning-desktop");
  }
  if (t.id === "s40-t07") {
    await expect(page.getByTestId("lab-points-summary").first()).toContainText("in the bin");
    await shotViewer(page, "robotics-t07-classifier-desktop");
  }
  if (t.id === "s40-t08") {
    await expect(page.getByTestId("lab-chart-summary")).toContainText("loss falls from");
    await expect(page.getByTestId("lab-chart-summary")).not.toContainText("blew up");
    await shotViewer(page, "robotics-t08-mlp-desktop");
  }
}

test("390px phone: the viewer fits, the arm and charts render, no sideways scrolling", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSolved(page, [...season1, ...lab.tickets.slice(0, 3)]);
  await page.goto(ticketUrl("s40-t04"));
  await waitForPython(page);
  await page.getByTestId("run-tests").click();
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible({ timeout: 30_000 });
  await expectDrawings(page, "s40-t04");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const box of [await viewer.boundingBox(), await page.getByTestId("lab-arm-svg").boundingBox()]) {
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.getByTestId("lab-arm").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "robotics-t04-390-arm.png") });
  await page.getByTestId("lab-chart").last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "robotics-t04-390-charts.png") });
  expect(errors).toEqual([]);
});
