// Manipulators · Module 3 (content/seasons/s43-manipulators-m3): velocity kinematics, a deep
// side floor that opens only once Module 2 is done (season.yaml `requires: s42-t11`).
// Every ticket is played: starter fails, solution passes, the 3D arm renders with its
// velocity arrows and manipulability ellipsoids, the quiz; the concept check is a read
// ticket; the ellipsoid flattening near a singularity fits a 390px phone.
// Replays start on their last frame (reduced motion), and frames are picked with the
// slider's keyboard: nothing here waits on real time.
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
const season1 = seasonTickets("s01-first-week");
const before = [...season1, ...m1.tickets, ...m2.tickets];
const codeTickets = m3.tickets.filter((t) => t.type !== "read");
const check = m3.tickets.find((t) => t.type === "read")!;
const ellipsoidTicket = m3.tickets.find((t) => t.id === "s43-t07")!;

const SHOTS = process.env.M34_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

/** Per ticket: 3D views drawn, the last view's triads, and its arrows / ellipsoids on the last frame (solution). */
const VIEWS: Record<string, { views: number; triads: number; arrows: number; ellipsoids: number }> = {
  "s43-t01": { views: 1, triads: 3, arrows: 1, ellipsoids: 0 },
  "s43-t02": { views: 1, triads: 3, arrows: 2, ellipsoids: 1 },
  "s43-t03": { views: 1, triads: 4, arrows: 6, ellipsoids: 0 },
  "s43-t04": { views: 1, triads: 7, arrows: 2, ellipsoids: 0 },
  "s43-t05": { views: 1, triads: 7, arrows: 3, ellipsoids: 0 },
  "s43-t06": { views: 2, triads: 7, arrows: 2, ellipsoids: 0 },
  "s43-t07": { views: 1, triads: 4, arrows: 0, ellipsoids: 1 },
  "s43-t08": { views: 1, triads: 4, arrows: 1, ellipsoids: 0 },
  "s43-t09": { views: 1, triads: 7, arrows: 1, ellipsoids: 0 },
};

/** Canvas pixels close to a colour: proof that something in that colour was really drawn. */
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
const CYAN: [number, number, number] = [34, 211, 238]; // the ellipsoid (cyan-400)
const FUCHSIA: [number, number, number] = [232, 121, 249]; // arrows (fuchsia-400)

async function expectArm(page: Page, id: string, solved: boolean) {
  const viewer = page.getByTestId("lab-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByTestId("lab-3d")).toHaveCount(VIEWS[id].views);
  for (const view of await viewer.getByTestId("lab-3d").all())
    await expect(view.getByTestId("lab-3d-summary")).toContainText(/Frame \d+ of \d+/);
  const canvas = viewer.getByTestId("lab-3d-canvas").last();
  await expect(canvas).toHaveAttribute("data-triads", String(VIEWS[id].triads));
  if (!solved) return;
  await expect(canvas).toHaveAttribute("data-arrows", String(VIEWS[id].arrows));
  await expect(canvas).toHaveAttribute("data-ellipsoids", String(VIEWS[id].ellipsoids));
  if (VIEWS[id].arrows) expect(await pixelsNear(canvas, FUCHSIA)).toBeGreaterThan(20);
  if (VIEWS[id].ellipsoids) expect(await pixelsNear(canvas, CYAN)).toBeGreaterThan(20);
}

/** The summary's condition number on the current frame (Infinity when flat). */
async function conditionNumber(summary: Locator): Promise<number> {
  const text = (await summary.textContent()) ?? "";
  if (text.includes("condition number ∞")) return Infinity;
  const m = text.match(/condition number ([\d.e+]+)/);
  expect(m, `no condition number in: ${text}`).not.toBeNull();
  return Number(m![1]);
}

test("content: 9 lesson tickets and a concept check, a side floor opened by Module 2's last ticket", () => {
  expect(m3.requires).toBe("s42-t11");
  expect(m3.requires).toBe(m2.tickets.at(-1)!.id);
  expect(m3.tickets).toHaveLength(10);
  expect(check.id).toBe("s43-t10");
  for (const t of m3.tickets) expect(t.questions.length).toBeGreaterThanOrEqual(3);
});

test("HQ: 'Manipulators · M3' stays locked until Module 2 is done ('opens after Manipulators · M2')", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, [...season1, ...m1.tickets, ...m2.tickets.slice(0, 10)]);
  await page.goto("/");
  const floor = page.getByTestId("side-floor-s43");
  await expect(page.getByTestId("side-floor-s42")).toHaveAttribute("data-state", "open");
  await expect(floor).toHaveAttribute("data-state", "locked");
  await expect(floor.getByRole("heading").first()).toContainText("🦾 Manipulators · M3");
  await expect(floor).toContainText("10 tickets · 🔒 opens after Manipulators · M2");
  await expect(floor.locator("[data-testid^=lab-room-]")).toHaveCount(10);
  // Module 4 is further down the line: it waits for Module 3.
  await expect(page.getByTestId("side-floor-s44")).toHaveAttribute("data-state", "locked");
  await expect(page.getByTestId("side-floor-s44")).toContainText("🔒 opens after Manipulators · M3");
  await page.goto(ticketUrl("s43-t01"));
  await expect(page.getByText("The Manipulators · M3 opens once you've finished the floor it builds on.")).toBeVisible();

  await seedSolved(page, before);
  await page.goto("/");
  await expect(floor).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s43-t01")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("lab-room-s43-t02")).toHaveAttribute("data-state", "locked");
  await floor.getByRole("button", { name: /Manipulators · M3/ }).click();
  await expect(floor).toContainText("Module 3 of 8: Velocity kinematics.");
  await floor.screenshot({ path: join(SHOTS, "m3-hq-floor.png") });
  expect(errors).toEqual([]);
});

for (const [i, t] of codeTickets.entries()) {
  test(`plays ${t.id}: deep lesson, starter fails, solution passes, velocities and ellipsoids in 3D, quiz`, async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedSolved(page, [...before, ...m3.tickets.slice(0, i)]);
    await page.goto(ticketUrl(t.id));
    await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
    await expect(page.getByTestId("side-floor-chip")).toContainText("🦾 Manipulators · M3");
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
  if (id === "s43-t01") {
    await expect(summary).toContainText("Frame 21 of 21");
    await expect(summary).toContainText(/ · v \(-?\d/);
  }
  if (id === "s43-t02") {
    // The elbow straightens: the velocity ellipse is round-ish at first, flat at the end.
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(canvas).toHaveAttribute("data-frame", "0");
    expect(await conditionNumber(summary)).toBeLessThan(5);
    await page.keyboard.press("End");
    await expect(canvas).toHaveAttribute("data-frame", "30");
    expect(await conditionNumber(summary)).toBeGreaterThan(50);
    await expect(summary).toContainText("col 1 (");
  }
  if (id === "s43-t04") {
    await expect(summary).toContainText("Frame 31 of 31");
    await expect(summary).toContainText("w x 0.2 (");
    await shotView(page, view, "m3-t04-ur5-velocity-desktop");
  }
  if (id === "s43-t06") {
    // The wrist flip: the two joint axes (arrows) line up at q5 = 0, the middle of the motion.
    await expect(page.getByTestId("lab-chart")).toHaveCount(1);
    await shotView(page, view, "m3-t06-wrist-flip-desktop");
  }
  if (id === "s43-t07") {
    // Away from the singularity (bent elbow): a round-ish ellipsoid. Stretched out: flat.
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(canvas).toHaveAttribute("data-frame", "0");
    await expect(summary).toContainText("velocity: radii");
    const away = await conditionNumber(summary);
    expect(away).toBeLessThan(5);
    await canvas.focus();
    await page.keyboard.press("0");
    await shotView(page, view, "m3-t07-ellipsoid-away-desktop");
    await slider.focus();
    await page.keyboard.press("End");
    await expect(canvas).toHaveAttribute("data-frame", "40");
    const near = await conditionNumber(summary);
    expect(near).toBeGreaterThan(100);
    expect(await pixelsNear(canvas, CYAN)).toBeGreaterThan(20);
    await shotView(page, view, "m3-t07-ellipsoid-near-desktop");
  }
  if (id === "s43-t09") {
    await expect(page.getByTestId("lab-chart")).toHaveCount(2);
    await expect(summary).toContainText("Frame 40 of 40");
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
  await expect(page.getByTestId("side-floor-s43")).toContainText("✅ 10/10 merged");
  // Module 3 done: Module 4 opens.
  await expect(page.getByTestId("side-floor-s44")).toHaveAttribute("data-state", "open");
  expect(errors).toEqual([]);
});

test("390px phone: the manipulability ellipsoid flattens near the singularity, no sideways scrolling", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedSolved(page, [...before, ...m3.tickets.slice(0, 6)]);
  await page.goto(ticketUrl(ellipsoidTicket.id));
  await waitForPython(page);
  for (const path of ellipsoidTicket.filesEditable) await setEditorFile(page, ellipsoidTicket.id, path, solutionFile(ellipsoidTicket, path));
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
  await expect(canvas).toHaveAttribute("data-ellipsoids", "1");
  expect(await pixelsNear(canvas, CYAN)).toBeGreaterThan(10);
  expect(await conditionNumber(view.getByTestId("lab-3d-summary"))).toBeGreaterThan(100);
  await view.screenshot({ path: join(SHOTS, "m3-t07-ellipsoid-near-390.png") });
  await view.getByTestId("lab-slider").focus();
  await page.keyboard.press("Home");
  await expect(canvas).toHaveAttribute("data-frame", "0");
  expect(await conditionNumber(view.getByTestId("lab-3d-summary"))).toBeLessThan(5);
  await view.screenshot({ path: join(SHOTS, "m3-t07-ellipsoid-away-390.png") });
  await page.screenshot({ path: join(SHOTS, "m3-t07-page-390.png") });
  expect(errors).toEqual([]);
});
