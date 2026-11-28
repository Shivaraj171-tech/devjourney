// Manipulators · Module 2 (content/seasons/s42-manipulators-m2): forward kinematics, a deep
// side floor that opens only once Module 1 is done (season.yaml `requires: s41-t11`: a
// side floor may require another side floor's ticket, so the modules open in sequence).
// Every ticket is played: starter fails, solution passes, the 3D arm renders with a frame
// on every joint (six DH frames on the UR5e), the quiz; the concept check is a read ticket;
// the UR5e fits a 390px phone.
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
} from "./helpers";
import { closeSolvedModal } from "./play";

const m1 = sideFloor("s41-manipulators-m1");
const m2 = sideFloor("s42-manipulators-m2");
const season1 = seasonTickets("s01-first-week");
const onChain = allSeasonTickets();
const codeTickets = m2.tickets.filter((t) => t.type !== "read");
const check = m2.tickets.find((t) => t.type === "read")!;
const ur5e = m2.tickets.find((t) => t.id === "s42-t06")!;

const SHOTS = process.env.M2_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

/** How many 3D views each ticket's tests draw (starter and solution alike), and the arm's triads (base included). */
const VIEWS: Record<string, { views: number; triads: number }> = {
  "s42-t01": { views: 1, triads: 5 },
  "s42-t02": { views: 1, triads: 3 },
  "s42-t03": { views: 1, triads: 4 },
  "s42-t04": { views: 2, triads: 3 },
  "s42-t05": { views: 1, triads: 4 },
  "s42-t06": { views: 1, triads: 7 },
  "s42-t07": { views: 1, triads: 7 },
  "s42-t08": { views: 1, triads: 4 },
  "s42-t09": { views: 1, triads: 7 },
  "s42-t10": { views: 1, triads: 8 },
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

async function expectArm(page: Page, id: string) {
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByTestId("lab-3d")).toHaveCount(VIEWS[id].views);
  for (const view of await viewer.getByTestId("lab-3d").all()) {
    await expect(view.getByTestId("lab-3d-summary")).toContainText(/Frame \d+ of \d+/);
    await expect(view.getByTestId("lab-3d-canvas")).toHaveAttribute("aria-label", /arrow keys/);
  }
  // The arm (always the last view): a triad on every joint frame.
  await expect(viewer.getByTestId("lab-3d-canvas").last()).toHaveAttribute("data-triads", String(VIEWS[id].triads));
}

test("content: 10 lesson tickets and a concept check, a side floor opened by Module 1's last ticket", () => {
  expect(m2.requires).toBe("s41-t11");
  expect(m2.requires).toBe(m1.tickets.at(-1)!.id);
  expect(m2.tickets).toHaveLength(11);
  expect(check.id).toBe("s42-t11");
  const ids = new Set(m2.tickets.map((t) => t.id));
  expect(onChain.some((t) => ids.has(t.id))).toBe(false);
  for (const t of m2.tickets) expect(t.questions.length).toBeGreaterThanOrEqual(3);
});

test("HQ: 'Manipulators · M2' stays locked until Module 1 is done ('opens after Manipulators · M1'), and never blocks the final exam", async ({ page }) => {
  const errors = trackPageErrors(page);
  // Season 1 done, Module 1 open but unfinished: M2 is locked and says what opens it.
  await seedSolved(page, [...season1, ...m1.tickets.slice(0, 10)]);
  await page.goto("/");
  const m1Floor = page.getByTestId("side-floor-s41");
  const floor = page.getByTestId("side-floor-s42");
  await expect(m1Floor).toHaveAttribute("data-state", "open");
  await expect(floor).toHaveAttribute("data-state", "locked");
  await expect(floor.getByRole("heading").first()).toContainText("Manipulators · M2");
  await expect(floor).toContainText("11 tickets. Opens after Manipulators · M1");
  await expect(floor.locator("[data-testid^=lab-room-]")).toHaveCount(11);
  await expect(page.getByTestId("lab-room-s42-t01")).toHaveAttribute("data-state", "locked");
  // Module 1 and the Robotics Lab are unchanged.
  await expect(m1Floor).toContainText("10/11 merged");
  await expect(page.getByTestId("side-floor-s40")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("side-floor-s40")).toContainText("0/8 merged");
  await page.goto(ticketUrl("s42-t01"));
  await expect(page.getByTestId("locked-reason")).toContainText("The Manipulators · M2 opens once you've merged ticket #");

  // Module 1's last ticket merged: M2 opens, its first room first.
  await seedSolved(page, [...season1, ...m1.tickets]);
  await page.goto("/");
  await expect(floor).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s42-t01")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s42-t02")).toHaveAttribute("data-state", "locked");
  await floor.getByRole("button", { name: /Manipulators · M2/ }).click();
  await expect(floor).toHaveAttribute("data-expanded", "true");
  await expect(floor).toContainText("Module 2 of 8: Forward kinematics.");
  await floor.screenshot({ path: join(SHOTS, "m2-hq-floor.png") });

  // The story alone opens the final exam: neither module is needed.
  await seedSolved(page, onChain);
  await page.goto("/");
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("side-floor-s42")).toHaveAttribute("data-state", "locked");
  await expect(page.getByTestId("side-floor-s42")).toContainText("Opens after Manipulators · M1");
  expect(errors).toEqual([]);
});

for (const [i, t] of codeTickets.entries()) {
  test(`plays ${t.id}: deep lesson, starter fails, solution passes, the 3D arm with every joint frame, quiz`, async ({ page }) => {
    const errors = trackPageErrors(page);
    await seedSolved(page, [...season1, ...m1.tickets, ...m2.tickets.slice(0, i)]);
    await page.goto(ticketUrl(t.id));
    await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
    await expect(page.getByTestId("side-floor-chip")).toContainText("Manipulators · M2");
    await page.getByTestId("lesson-toggle").click();
    const lesson = page.locator("#ticket-lesson");
    await expect(page.getByTestId("lesson-toggle")).toContainText("Deep lesson");
    for (const section of ["Intuition", "The maths", "Worked example", "Watch out", "AI check"])
      await expect(lesson.getByText(section, { exact: false }).first()).toBeVisible();
    await waitForPython(page);
    await expect(page.getByTestId("lab-viewer")).toHaveCount(0);

    await runTests(page);
    await expect(page.getByTestId("run-error")).toHaveCount(0);
    await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
    await expectArm(page, t.id);

    for (const path of t.filesEditable) await setEditorFile(page, t.id, path, solutionFile(t, path));
    await runTests(page);
    await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
    await closeSolvedModal(page, t.type === "incident" ? "Incident resolved" : "PR merged");
    await expectArm(page, t.id);
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
  const view = page.getByTestId("lab-3d").last();
  const canvas = view.getByTestId("lab-3d-canvas");
  const summary = view.getByTestId("lab-3d-summary");
  if (id === "s42-t03") {
    await expect(summary).toContainText("Frame 41 of 41", { timeout: 10_000 });
    await expect(summary).toContainText("0.000 away");
  }
  if (id === "s42-t04") {
    // The first view: one DH row built move by move, five labelled frames.
    await expect(page.getByTestId("lab-3d").first().getByTestId("lab-3d-canvas")).toHaveAttribute("data-triads", "5");
    await expect(summary).toContainText("0.000 away", { timeout: 10_000 });
  }
  if (id === "s42-t06") {
    // The full 6-DOF arm: home → two random poses, a triad on all six DH frames.
    await expect(canvas).toHaveAttribute("data-triads", "7");
    await expect(summary).toContainText("Frame 61 of 61", { timeout: 15_000 });
    await expect(summary).toContainText("flange (frame 6) at (-0.22, 0.05, 0.53)");
    await expect(summary).toContainText("0.000 away");
    expect(await redPixels(canvas)).toBeGreaterThan(30);
    // Scrub back to the start: the documented home pose.
    const slider = view.getByTestId("lab-slider");
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(canvas).toHaveAttribute("data-frame", "0");
    await expect(summary).toContainText("flange (frame 6) at (-0.82, -0.23, 0.06)");
    await page.keyboard.press("End");
    await expect(canvas).toHaveAttribute("data-frame", "60");
    await view.getByTestId("lab-3d-reset").click();
    await shotViewer(page, "m2-t06-ur5e-desktop");
  }
  if (id === "s42-t07") {
    await expect(summary).toContainText("Frame 41 of 41", { timeout: 10_000 });
    await shotViewer(page, "m2-t07-wrist-desktop");
  }
  if (id === "s42-t09") {
    await expect(summary).toContainText("Frame 41 of 41", { timeout: 10_000 });
    await expect(summary).toContainText("0.000 away");
    await expect(summary).toContainText("turned 0° from the target's orientation");
  }
  if (id === "s42-t10") {
    await expect(summary).toContainText("fingertips at (0.43, 0.74, 0.15)", { timeout: 10_000 });
    await expect(summary).toContainText("0.000 away");
    await shotViewer(page, "m2-t10-grabby6-desktop");
  }
}

test(`plays ${check.id}: the module concept check (a read ticket with practice formats)`, async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, [...season1, ...m1.tickets, ...codeTickets]);
  await page.goto(ticketUrl(check.id));
  await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
  await expect(page.getByTestId("run-tests")).toHaveCount(0);
  await openQuizTab(page);
  await answerQuiz(page, check.questions);
  await closeSolvedModal(page, "Ticket closed");
  await expect(page.getByTestId("quiz-done")).toContainText(`${check.questions.length}/${check.questions.length}`);
  expect((await readProgress(page)).tickets[check.id].solved).toBe(true);

  await page.goto("/");
  await expect(page.getByTestId("side-floor-s42")).toContainText("11/11 merged");
  expect(errors).toEqual([]);
});

test("390px phone: the 6-DOF UR5e fits, renders all six joint frames, turns with the keyboard, no sideways scrolling", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, [...season1, ...m1.tickets, ...m2.tickets.slice(0, 5)]);
  await page.goto(ticketUrl(ur5e.id));
  await waitForPython(page);
  for (const path of ur5e.filesEditable) await setEditorFile(page, ur5e.id, path, solutionFile(ur5e, path));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("run-tests").click();
  await closeSolvedModal(page, "PR merged");
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
  await expect(canvas).toHaveAttribute("data-triads", "7");
  await expect(page.getByTestId("lab-3d-summary")).toContainText("Frame 61 of 61", { timeout: 15_000 });
  await expect(page.getByTestId("lab-3d-summary")).toContainText("0.000 away");
  expect(await redPixels(canvas)).toBeGreaterThan(10);
  await canvas.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(canvas).toHaveAttribute("data-yaw", "20");
  await page.keyboard.press("0");
  await page.getByTestId("lab-3d").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "m2-t06-ur5e-390.png") });
  await page.getByTestId("lab-3d").screenshot({ path: join(SHOTS, "m2-t06-ur5e-390-view.png") });
  expect(errors).toEqual([]);
});
