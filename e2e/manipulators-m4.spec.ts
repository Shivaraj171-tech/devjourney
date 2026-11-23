// Manipulators · Module 4 (content/seasons/s44-manipulators-m4): inverse kinematics, a deep
// side floor that opens only once Module 3 is done (season.yaml `requires: s43-t10`).
// Every ticket is played: starter fails, solution passes, the 3D arm renders (Newton's
// iterates frame by frame, the wrist-centre arrow, the ellipsoid flattening at the edge of
// reach), the quiz; the concept check is a read ticket; IK convergence fits a 390px phone.
// Replays start on their last frame (reduced motion) and frames are picked with the slider's
// keyboard: nothing here waits on real time.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
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
const m3 = sideFloor("s43-manipulators-m3");
const m4 = sideFloor("s44-manipulators-m4");
const season1 = seasonTickets("s01-first-week");
const before = [...season1, ...m1.tickets, ...m2.tickets, ...m3.tickets];
const codeTickets = m4.tickets.filter((t) => t.type !== "read");
const check = m4.tickets.find((t) => t.type === "read")!;
const newton = m4.tickets.find((t) => t.id === "s44-t05")!;

const SHOTS = process.env.M34_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

/** Per ticket: 3D views drawn, the last view's triads, and its arrows / ellipsoids on the last frame (solution). */
const VIEWS: Record<string, { views: number; triads: number; arrows: number; ellipsoids: number }> = {
  "s44-t01": { views: 1, triads: 4, arrows: 0, ellipsoids: 0 },
  "s44-t02": { views: 1, triads: 4, arrows: 0, ellipsoids: 0 },
  "s44-t03": { views: 1, triads: 4, arrows: 0, ellipsoids: 0 },
  "s44-t04": { views: 1, triads: 7, arrows: 1, ellipsoids: 0 },
  "s44-t05": { views: 1, triads: 4, arrows: 1, ellipsoids: 0 },
  "s44-t06": { views: 1, triads: 7, arrows: 0, ellipsoids: 0 },
  "s44-t07": { views: 1, triads: 4, arrows: 0, ellipsoids: 1 },
  "s44-t08": { views: 1, triads: 4, arrows: 0, ellipsoids: 0 },
  "s44-t09": { views: 1, triads: 7, arrows: 0, ellipsoids: 1 },
};

async function pixelsNear(canvas: Locator, rgb: [number, number, number], tol = 40): Promise<number> {
  return canvas.evaluate(
    (el, [r, g, b, t]) => {
      const c = el as HTMLCanvasElement;
      const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < data.length; i += 4)
        if (Math.abs(data[i] - r) < t && Math.abs(data[i + 1] - g) < t && Math.abs(data[i + 2] - b) < t) n++;
      return n;
    },
    [...rgb, tol] as [number, number, number, number],
  );
}
const CYAN: [number, number, number] = [34, 211, 238];
const FUCHSIA: [number, number, number] = [232, 121, 249];

async function expectArm(page: Page, id: string, solved: boolean) {
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByTestId("lab-3d")).toHaveCount(VIEWS[id].views);
  await expect(viewer.getByTestId("lab-3d-summary").last()).toContainText(/Frame \d+ of \d+/);
  const canvas = viewer.getByTestId("lab-3d-canvas").last();
  await expect(canvas).toHaveAttribute("data-triads", String(VIEWS[id].triads));
  if (!solved) return;
  await expect(canvas).toHaveAttribute("data-arrows", String(VIEWS[id].arrows));
  await expect(canvas).toHaveAttribute("data-ellipsoids", String(VIEWS[id].ellipsoids));
  // (Newton's error arrow has length 0 on its last, converged frame: checked at the start instead.)
  if (VIEWS[id].arrows && id !== "s44-t05") expect(await pixelsNear(canvas, FUCHSIA)).toBeGreaterThan(20);
  if (VIEWS[id].ellipsoids) expect(await pixelsNear(canvas, CYAN)).toBeGreaterThan(10);
}

/** "target (..), 0.123 away" in the 3D summary, as a number. */
async function distanceToTarget(summary: Locator): Promise<number> {
  const text = (await summary.textContent()) ?? "";
  const m = text.match(/target \([^)]*\), ([\d.]+) away/);
  expect(m, `no target distance in: ${text}`).not.toBeNull();
  return Number(m![1]);
}

test("content: 9 lesson tickets and a concept check, a side floor opened by Module 3's last ticket", () => {
  expect(m4.requires).toBe("s43-t10");
  expect(m4.requires).toBe(m3.tickets.at(-1)!.id);
  expect(m4.tickets).toHaveLength(10);
  expect(check.id).toBe("s44-t10");
  for (const t of m4.tickets) expect(t.questions.length).toBeGreaterThanOrEqual(3);
});

test("HQ: 'Manipulators · M4' stays locked until Module 3 is done, then opens room by room", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, [...season1, ...m1.tickets, ...m2.tickets, ...m3.tickets.slice(0, 9)]);
  await page.goto("/");
  const floor = page.getByTestId("side-floor-s44");
  await expect(page.getByTestId("side-floor-s43")).toHaveAttribute("data-state", "open");
  await expect(floor).toHaveAttribute("data-state", "locked");
  await expect(floor.getByRole("heading").first()).toContainText("🦾 Manipulators · M4");
  await expect(floor).toContainText("10 tickets · 🔒 opens after Manipulators · M3");
  await page.goto(ticketUrl("s44-t01"));
  await expect(page.getByText("The Manipulators · M4 opens once you've finished the floor it builds on.")).toBeVisible();

  await seedSolved(page, before);
  await page.goto("/");
  await expect(floor).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s44-t01")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s44-t02")).toHaveAttribute("data-state", "locked");
  await floor.getByRole("button", { name: /Manipulators · M4/ }).click();
  await expect(floor).toContainText("Module 4 of 8: Inverse kinematics.");
  await floor.screenshot({ path: join(SHOTS, "m4-hq-floor.png") });
  expect(errors).toEqual([]);
});

for (const [i, t] of codeTickets.entries()) {
  test(`plays ${t.id}: deep lesson, starter fails, solution passes, IK in 3D, quiz`, async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedSolved(page, [...before, ...m4.tickets.slice(0, i)]);
    await page.goto(ticketUrl(t.id));
    await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
    await expect(page.getByTestId("side-floor-chip")).toContainText("🦾 Manipulators · M4");
    await page.getByTestId("lesson-toggle").click();
    const lesson = page.locator("#ticket-lesson");
    await expect(page.getByTestId("lesson-toggle")).toContainText("Deep lesson");
    for (const section of ["Intuition", "The maths", "Worked example", "Watch out", "AI check"])
      await expect(lesson.getByText(section, { exact: false }).first()).toBeVisible();
    await waitForPython(page);

    await runTests(page);
    await expect(page.getByTestId("run-error")).toHaveCount(0);
    await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
    await expectArm(page, t.id, false);

    for (const path of t.filesEditable) await setEditorFile(page, t.id, path, solutionFile(t, path));
    await runTests(page);
    await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
    await closeSolvedModal(page, t.type === "incident" ? "Incident resolved!" : "PR merged!");
    await expectArm(page, t.id, true);
    await checkTicketSpecifics(page, t.id);

    await openQuizTab(page);
    await answerQuiz(page, t.questions);
    await expect(page.getByTestId("quiz-done")).toContainText(`${t.questions.length}/${t.questions.length}`);
    expect((await readProgress(page)).tickets[t.id].solved).toBe(true);
    expect(errors).toEqual([]);
  });
}

async function shotView(page: Page, view: Locator, name: string) {
  await page.setViewportSize({ width: 1440, height: 1500 });
  await view.scrollIntoViewIfNeeded();
  await view.screenshot({ path: join(SHOTS, `${name}.png`) });
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function checkTicketSpecifics(page: Page, id: string) {
  const view = page.getByTestId("lab-3d").last();
  const canvas = view.getByTestId("lab-3d-canvas");
  const summary = view.getByTestId("lab-3d-summary");
  const slider = view.getByTestId("lab-slider");
  if (id === "s44-t03") {
    await expect(summary).toContainText("0.000 away"); // the fourth solution, on the box too
  }
  if (id === "s44-t04") {
    await expect(summary).toContainText("back off d6 (");
    await expect(summary).toContainText("0.000 away");
    await expect(summary).toContainText("turned 0° from the target's orientation");
  }
  if (id === "s44-t05") {
    // Newton frame by frame: far at the first iterate, on the box at the last.
    await expect(page.getByTestId("lab-chart")).toHaveCount(1);
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(canvas).toHaveAttribute("data-frame", "0");
    expect(await distanceToTarget(summary)).toBeGreaterThan(0.1);
    expect(await pixelsNear(canvas, FUCHSIA)).toBeGreaterThan(20); // the error arrow, wrist to box
    await shotView(page, view, "m4-t05-newton-start-desktop");
    await page.keyboard.press("End");
    expect(await distanceToTarget(summary)).toBeLessThan(0.0005);
    await expect(summary).toContainText("error (0.00, 0.00, 0.00)");
    await shotView(page, view, "m4-t05-newton-converged-desktop");
    await page.getByTestId("lab-chart").screenshot({ path: join(SHOTS, "m4-t05-newton-chart-desktop.png") });
  }
  if (id === "s44-t06") {
    await expect(summary).toContainText("0.000 away");
    await expect(summary).toContainText("turned 0° from the target's orientation");
    await shotView(page, view, "m4-t06-full-pose-desktop");
  }
  if (id === "s44-t07") {
    await expect(summary).toContainText("velocity: radii");
    const d = await distanceToTarget(summary);
    expect(d).toBeGreaterThan(0.04);
    expect(d).toBeLessThan(0.06);
  }
  if (id === "s44-t09") {
    await expect(summary).toContainText("velocity: radii");
    await shotView(page, view, "m4-t09-edge-of-reach-desktop");
  }
}

test(`plays ${check.id}: the module concept check (a read ticket with practice formats)`, async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, [...before, ...codeTickets]);
  await page.goto(ticketUrl(check.id));
  await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
  await expect(page.getByTestId("run-tests")).toHaveCount(0);
  await openQuizTab(page);
  await answerQuiz(page, check.questions);
  await closeSolvedModal(page, "Ticket closed!");
  await expect(page.getByTestId("quiz-done")).toContainText(`${check.questions.length}/${check.questions.length}`);
  expect((await readProgress(page)).tickets[check.id].solved).toBe(true);
  await page.goto("/");
  await expect(page.getByTestId("side-floor-s44")).toContainText("✅ 10/10 merged");
  expect(errors).toEqual([]);
});

test("390px phone: Newton's convergence in 3D fits, frame by frame, no sideways scrolling", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedSolved(page, [...before, ...m4.tickets.slice(0, 4)]);
  await page.goto(ticketUrl(newton.id));
  await waitForPython(page);
  for (const path of newton.filesEditable) await setEditorFile(page, newton.id, path, solutionFile(newton, path));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("run-tests").click();
  await closeSolvedModal(page, "PR merged!");
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible({ timeout: 30_000 });
  const view = page.getByTestId("lab-3d");
  const canvas = view.getByTestId("lab-3d-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const box of [await viewer.boundingBox(), await canvas.boundingBox()]) {
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  const summary = view.getByTestId("lab-3d-summary");
  expect(await distanceToTarget(summary)).toBeLessThan(0.0005);
  await view.screenshot({ path: join(SHOTS, "m4-t05-newton-converged-390.png") });
  await view.getByTestId("lab-slider").focus();
  await page.keyboard.press("Home");
  await expect(canvas).toHaveAttribute("data-frame", "0");
  expect(await distanceToTarget(summary)).toBeGreaterThan(0.1);
  expect(await pixelsNear(canvas, FUCHSIA)).toBeGreaterThan(10);
  await view.screenshot({ path: join(SHOTS, "m4-t05-newton-start-390.png") });
  await page.screenshot({ path: join(SHOTS, "m4-t05-page-390.png") });
  expect(errors).toEqual([]);
});
