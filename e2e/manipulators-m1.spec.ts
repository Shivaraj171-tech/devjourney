// Manipulators · Module 1 (content/seasons/s41-manipulators-m1): a deep side floor
// (`lesson: long`) that opens once Season 1 is done, drawn in the 🔭 Lab viewer's
// 3D view (`viz.frames3d` / `viz.arm3d` -> components/Frames3DView.tsx).
// Every ticket is played: starter fails, solution passes, the 3D view renders and
// turns with the keyboard, the quiz; the concept check is a read ticket; 390px fits.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  allSeasonTickets,
  answerQuiz,
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
  lessonHeadings,
} from "./helpers";
import { closeSolvedModal } from "./play";

const m1 = sideFloor("s41-manipulators-m1");
const season1 = seasonTickets("s01-first-week");
const onChain = allSeasonTickets();
const codeTickets = m1.tickets.filter((t) => t.type !== "read");
const check = m1.tickets.find((t) => t.type === "read")!;

const SHOTS = process.env.M1_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

/** How many 3D views each ticket's tests draw (starter and solution alike). */
const VIEWS: Record<string, number> = {
  "s41-t01": 2,
  "s41-t02": 1,
  "s41-t03": 2,
  "s41-t04": 2,
  "s41-t05": 1,
  "s41-t06": 1,
  "s41-t07": 1,
  "s41-t08": 1,
  "s41-t09": 1,
  "s41-t10": 1,
};

/** Pixels of the x-axis red (#f87171) on the canvas: proof that something was really drawn. */
async function redPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] < 150 && data[i + 2] < 150) n++;
    return n;
  });
}

async function expect3d(page: Page, id: string) {
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByTestId("lab-3d")).toHaveCount(VIEWS[id]);
  for (const view of await viewer.getByTestId("lab-3d").all()) {
    await expect(view.getByTestId("lab-3d-summary")).toContainText(/Frame \d+ of \d+/);
    await expect(view.getByTestId("lab-3d-summary")).toContainText("its x axis points (");
    await expect(view.getByTestId("lab-3d-canvas")).toHaveAttribute("aria-label", /arrow keys/);
  }
}

test("content: 10 lesson tickets and a concept check on a deep side floor opened by the end of Season 1", () => {
  expect(m1.requires).toBe("s01-t10");
  expect(m1.tickets).toHaveLength(11);
  expect(check.id).toBe("s41-t11");
  const ids = new Set(m1.tickets.map((t) => t.id));
  expect(onChain.some((t) => ids.has(t.id))).toBe(false);
  for (const t of m1.tickets) expect(t.questions.length).toBeGreaterThanOrEqual(3);
});

test("HQ: '🦾 Manipulators · M1' is locked until Season 1 is done, then opens; it never blocks the final exam", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, season1.slice(0, 9));
  await page.goto("/");
  const floor = page.getByTestId("side-floor-s41");
  await expect(floor).toHaveAttribute("data-state", "locked");
  await expect(floor.getByRole("heading").first()).toContainText("🦾 Manipulators · M1");
  await expect(floor).toContainText("11 tickets · 🔒 opens after Floor 1");
  await expect(floor.locator("[data-testid^=lab-room-]")).toHaveCount(11);
  // The Robotics Lab is still there, unchanged.
  await expect(page.getByTestId("side-floor-s40")).toContainText("8 tickets");
  await page.goto(ticketUrl("s41-t01"));
  await expect(page.getByTestId("locked-reason")).toContainText("The Manipulators · M1 opens once you've merged ticket #");

  await seedSolved(page, season1);
  await page.goto("/");
  await expect(floor).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s41-t01")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s41-t02")).toHaveAttribute("data-state", "locked");
  await floor.getByRole("button", { name: /Manipulators · M1/ }).click();
  await expect(floor).toHaveAttribute("data-expanded", "true");
  await expect(floor).toContainText("Module 1 of 8: Rigid-body motion.");
  await floor.screenshot({ path: join(SHOTS, "m1-hq-floor.png") });

  await seedSolved(page, onChain);
  await page.goto("/");
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "open");
  expect(errors).toEqual([]);
});

for (const [i, t] of codeTickets.entries()) {
  test(`plays ${t.id}: deep lesson, starter fails, solution passes, the 3D view draws it, quiz`, async ({ page }) => {
    const errors = trackPageErrors(page);
    await seedSolved(page, [...season1, ...m1.tickets.slice(0, i)]);
    await page.goto(ticketUrl(t.id));
    await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
    await expect(page.getByTestId("side-floor-chip")).toContainText("🦾 Manipulators · M1");
    // The deep lesson: five sections (picture, maths, worked example, trap, AI check), each with its own heading.
    await page.getByTestId("lesson-toggle").click();
    const lesson = page.locator("#ticket-lesson");
    await expect(page.getByTestId("lesson-toggle")).toContainText("Deep lesson");
    const headings = lessonHeadings(t);
    expect(headings.length).toBeGreaterThanOrEqual(5);
    for (const section of headings) await expect(lesson.getByText(section, { exact: false }).first()).toBeVisible();
    await waitForPython(page);
    await expect(page.getByTestId("lab-viewer")).toHaveCount(0);

    await runTests(page);
    await expect(page.getByTestId("run-error")).toHaveCount(0);
    await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
    await expect3d(page, t.id);
    if (t.id === "s41-t08") await expect(page.getByTestId("lab-3d-warning")).toContainText("bottom row is not [0, 0, 0, 1]");

    for (const path of t.filesEditable) await setEditorFile(page, t.id, path, solutionFile(t, path));
    await runTests(page);
    await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
    await closeSolvedModal(page, t.type === "incident" ? "Incident resolved!" : "PR merged!");
    await expect3d(page, t.id);
    if (t.id === "s41-t08") await expect(page.getByTestId("lab-3d-warning")).toHaveCount(0);
    await checkTicketSpecifics(page, t.id);

    await openQuizTab(page);
    await answerQuiz(page, t.questions);
    await expect(page.getByTestId("quiz-done")).toContainText(`${t.questions.length}/${t.questions.length}`);
    expect((await readProgress(page)).tickets[t.id].solved).toBe(true);
    expect(errors).toEqual([]);
  });
}

async function shotViewer(page: Page, name: string) {
  await page.setViewportSize({ width: 1440, height: 1500 });
  const viewer = page.getByTestId("lab-viewer");
  await viewer.scrollIntoViewIfNeeded();
  await viewer.screenshot({ path: join(SHOTS, `${name}-viewer.png`) });
  await page.screenshot({ path: join(SHOTS, `${name}-page.png`) });
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function checkTicketSpecifics(page: Page, id: string) {
  const view = page.getByTestId("lab-3d").first();
  const canvas = view.getByTestId("lab-3d-canvas");
  const summary = view.getByTestId("lab-3d-summary");
  if (id === "s41-t01") {
    // Plays to the end: the box ends exactly on the dashed target (a quarter turn: its x axis along y).
    await expect(summary).toContainText("Frame 31 of 31", { timeout: 10_000 });
    await expect(summary).toContainText("box at (0.60, 0.00, 0.00), its x axis points (0.00, 1.00, 0.00)");
    await expect(summary).toContainText("turned 0° from the target's orientation");
    expect(await redPixels(canvas)).toBeGreaterThan(20);

    // Keyboard: arrows turn the view, + zooms, 0 resets; the replay slider scrubs frames.
    await expect(canvas).toHaveAttribute("data-yaw", "35");
    await expect(canvas).toHaveAttribute("data-pitch", "25");
    await canvas.focus();
    await page.keyboard.press("ArrowRight");
    await expect(canvas).toHaveAttribute("data-yaw", "50");
    await page.keyboard.press("ArrowUp");
    await expect(canvas).toHaveAttribute("data-pitch", "35");
    await expect(view.getByTestId("lab-3d-view")).toContainText("View from 50° around, 35° up");
    const dist = Number(await canvas.getAttribute("data-dist"));
    await page.keyboard.press("+");
    expect(Number(await canvas.getAttribute("data-dist"))).toBeLessThan(dist);
    await page.keyboard.press("0");
    await expect(canvas).toHaveAttribute("data-yaw", "35");
    // Zoom buttons and turn buttons (touch users).
    await view.getByTestId("lab-3d-zoom-out").click();
    expect(Number(await canvas.getAttribute("data-dist"))).toBeGreaterThan(dist);
    await view.getByTestId("lab-3d-turn-left").click();
    await expect(canvas).toHaveAttribute("data-yaw", "20");
    // Drag to orbit.
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 + 30, { steps: 5 });
    await page.mouse.up();
    await expect(canvas).not.toHaveAttribute("data-yaw", "20");
    await expect(canvas).not.toHaveAttribute("data-pitch", "25");
    // The shared replay slider.
    const slider = view.getByTestId("lab-slider");
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(canvas).toHaveAttribute("data-frame", "0");
    await expect(summary).toContainText("Frame 1 of 31");
    await page.keyboard.press("End");
    await expect(canvas).toHaveAttribute("data-frame", "30");
    await view.getByTestId("lab-3d-reset").click();
    await shotViewer(page, "m1-t01-desktop");
  }
  if (id === "s41-t04") {
    await expect(page.getByTestId("lab-3d").nth(1).getByTestId("lab-3d-summary")).toContainText("turned 0° from the target's orientation", { timeout: 10_000 });
    await shotViewer(page, "m1-t04-gimbal-desktop");
  }
  if (id === "s41-t07") {
    await expect(summary).toContainText("Frame 41 of 41", { timeout: 10_000 });
    await shotViewer(page, "m1-t07-slerp-desktop");
  }
  if (id === "s41-t10") {
    await expect(summary).toContainText("gripper at (0.27, 0.47, 0.09)", { timeout: 10_000 });
    await expect(summary).toContainText("0.000 away");
    await shotViewer(page, "m1-t10-arm3d-desktop");
  }
}

test(`plays ${check.id}: the module concept check (a read ticket with practice formats)`, async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, [...season1, ...codeTickets]);
  await page.goto(ticketUrl(check.id));
  await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
  await expect(page.getByTestId("run-tests")).toHaveCount(0);
  await openQuizTab(page);
  await answerQuiz(page, check.questions);
  await closeSolvedModal(page, "Ticket closed!");
  await expect(page.getByTestId("quiz-done")).toContainText(`${check.questions.length}/${check.questions.length}`);
  expect((await readProgress(page)).tickets[check.id].solved).toBe(true);

  await page.goto("/");
  await expect(page.getByTestId("side-floor-s41")).toContainText("✅ 11/11 merged");
  expect(errors).toEqual([]);
});

test("390px phone: the 3D view fits, renders, turns with the keyboard, no sideways scrolling", async ({ page }) => {
  const errors = trackPageErrors(page);
  // Fix the incident at desktop size (the editor is a separate step on a phone), then look at it on a phone.
  await seedSolved(page, [...season1, ...m1.tickets.slice(0, 9)]);
  const t = m1.tickets[9];
  await page.goto(ticketUrl(t.id));
  await waitForPython(page);
  for (const path of t.filesEditable) await setEditorFile(page, t.id, path, solutionFile(t, path));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("run-tests").click();
  await closeSolvedModal(page, "Incident resolved!");
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible({ timeout: 30_000 });
  const canvas = page.getByTestId("lab-3d-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const box of [await viewer.boundingBox(), await canvas.boundingBox()]) {
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await expect(page.getByTestId("lab-3d-summary")).toContainText("0.000 away", { timeout: 10_000 });
  expect(await redPixels(canvas)).toBeGreaterThan(10);
  await canvas.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(canvas).toHaveAttribute("data-yaw", "20");
  await page.keyboard.press("0");
  await page.getByTestId("lab-3d").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "m1-t10-390.png") });
  await page.getByTestId("lab-3d").screenshot({ path: join(SHOTS, "m1-t10-390-view.png") });
  expect(errors).toEqual([]);
});
