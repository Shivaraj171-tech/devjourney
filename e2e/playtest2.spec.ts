// Playtest 2 fixes (docs/research/playtest-2.md): Byte waits for evidence on a
// first visit, "Not sure yet" in the skills check, practice rounds left out of
// the human-in-the-loop score, the story first, the phone debugger, wrapped
// Byte diffs and Parsons lines, the badge toast, inline code in quizzes and
// the incident logs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import {
  allSeasonTickets,
  answerQuiz,
  openQuizTab,
  plainText,
  PROGRESS_KEY,
  readProgress,
  revealByteCard,
  runTests,
  seedSolved,
  ticketUrl,
  trackPageErrors,
  waitForPython,
} from "./helpers";

const all = allSeasonTickets();
const byId = (id: string) => all.find((t) => t.id === id)!;
const before = (id: string) => all.slice(0, all.findIndex((t) => t.id === id));
const yamlOf = <T,>(id: string, file: string) => load(readFileSync(join(byId(id).dir, file), "utf-8")) as T;
type Why = { suggestion: { replace: string; why: { choices: string[]; answer: number } } };

const card = (page: Page) => page.getByTestId("byte-suggestion");
const top = async (page: Page, testId: string) => (await page.getByTestId(testId).boundingBox())!.y;

async function openFresh(page: Page, id: string) {
  await seedSolved(page, before(id));
  await page.goto(ticketUrl(id));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Save progress as-is (for Byte records and half-done quizzes), then reload. */
async function seedProgress(page: Page, tickets: Record<string, Record<string, unknown>>) {
  await page.goto("/");
  await page.evaluate(
    ({ key, tickets }) => {
      const now = new Date().toISOString();
      const state: Record<string, unknown> = {};
      for (const [id, extra] of Object.entries(tickets)) {
        state[id] = {
          code: {}, runs: 1, hintsUsed: 0, solved: true, solvedAt: now, solveXp: 100,
          quizFirstPick: [], quizDone: true, quizFirstTryCorrect: 0, quizXp: 0, ...extra,
        };
      }
      localStorage.setItem(key, JSON.stringify({ version: 1, playerName: "You", startedAt: now, activeDays: [], onboarded: true, tickets: state }));
    },
    { key: PROGRESS_KEY, tickets },
  );
  await page.reload();
}

// ---------- 1 + 6: the story first, Byte after the first run ----------

test("first visit: story unfolded above a folded Byte teaser; the card arrives with the first run", async ({ page }) => {
  const errors = trackPageErrors(page);
  await openFresh(page, "s01-t01");
  const story = page.getByTestId("ticket-story");
  await expect(story).toHaveAttribute("data-open", "true");
  await expect(page.getByTestId("byte-teaser")).toContainText("Run the checks first, then decide");
  await expect(card(page)).toHaveCount(0);
  expect(await top(page, "ticket-goal")).toBeLessThan(await top(page, "ticket-story"));
  expect(await top(page, "ticket-story")).toBeLessThan(await top(page, "byte-teaser"));

  // The first run brings Byte's card out (no peeking needed).
  await runTests(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toHaveAttribute("data-outcome", "undecided");
  await expect(page.getByTestId("byte-teaser")).toHaveCount(0);

  // Falling for the tutorial trap teaches instead of scolding, and is saved as practice.
  const why = yamlOf<Why>("s01-t01", "byte.yaml").suggestion.why;
  await page.getByTestId("byte-accept").click();
  await page.getByTestId(`byte-why-${why.answer === 0 ? 1 : 0}`).click();
  await page.getByTestId("byte-lock").click();
  await expect(card(page)).toHaveAttribute("data-outcome", "pending");
  await runTests(page);
  await expect(card(page)).toHaveAttribute("data-outcome", "waved-through");
  const outcome = page.getByTestId("byte-outcome");
  await expect(outcome).toContainText("That's why we start here");
  await expect(outcome).toContainText("Most new devs accept this one");
  await expect(outcome).not.toContainText("You accepted Byte's code without checking");
  expect((await readProgress(page)).tickets["s01-t01"].byteSuggestion).toMatchObject({ decision: "accept", tutorial: true });

  // Later visits: Byte's card under the goal, the story folded below it.
  await page.reload();
  await expect(card(page)).toBeVisible();
  await expect(story).toHaveAttribute("data-open", "false");
  expect(await top(page, "byte-suggestion")).toBeLessThan(await top(page, "ticket-story"));
  expect(errors).toEqual([]);
});

test("a learner who opened the ticket before sees Byte's card straight away; 'Peek now' opens it too", async ({ page }) => {
  await openFresh(page, "s01-t02");
  await expect(page.getByTestId("byte-teaser")).toBeVisible();
  await page.getByTestId("byte-teaser-open").click();
  await expect(card(page)).toBeVisible();
  expect((await readProgress(page)).openedTickets).toContain("s01-t02");
  await page.reload();
  await expect(card(page)).toBeVisible();
  await expect(page.getByTestId("byte-teaser")).toHaveCount(0);
});

// ---------- 2: skills check ----------

test("skills check: 'Not sure yet' on every question, and the baseline result has context", async ({ page }) => {
  await seedSolved(page, []);
  await page.goto("/skills-check/");
  await page.getByTestId("skills-start").click();
  for (let n = 0; n < 12; n++) {
    await expect(page.getByTestId("skills-position")).toHaveText(`Question ${n + 1} of 12`);
    const notSure = page.getByTestId("skills-not-sure");
    await expect(notSure).toContainText("Not sure yet");
    await notSure.click();
    await expect(notSure).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("skills-next").click();
  }
  await expect(page.getByTestId("skills-comparison")).toHaveText("Baseline 0/12");
  await expect(page.getByTestId("skills-baseline-context")).toHaveText("Most people starting out score 2 to 5. You'll take it again at the end.");
  const saved = (await readProgress(page)).skillsCheck.baseline;
  expect(Object.values(saved.answers).every((a) => a === -1)).toBe(true);
});

// ---------- 4: human-in-the-loop score ----------

test("the tutorial tickets' Byte calls don't count toward the human-in-the-loop score", async ({ page }) => {
  // An older save: the two tutorial traps waved through (no `tutorial` mark yet), one real catch.
  const rec = (decision: string, correct: boolean) => ({ byteSuggestion: { decision, correct, runsAtDecision: 0 }, runs: 2 });
  await seedProgress(page, {
    "s01-t01": rec("accept", false),
    "s01-t02": rec("accept", false),
    "s01-t03": rec("reject", false),
  });
  const hitl = page.getByTestId("hitl-score");
  await expect(hitl).toBeVisible();
  await expect(page.getByTestId("hitl-caught")).toHaveText("1/1");
  await expect(page.getByTestId("hitl-waved")).toHaveText("0");
  await expect(page.getByTestId("hitl-accuracy")).toHaveText("100% good calls");
  await expect(page.getByTestId("hitl-practice")).toContainText("first 2 Byte calls were practice rounds");

  // Only practice calls so far: no score card yet.
  await seedProgress(page, { "s01-t01": rec("accept", false), "s01-t02": rec("accept", false) });
  await expect(page.getByTestId("office-map").first()).toBeVisible();
  await expect(hitl).toHaveCount(0);
});

// ---------- 9: Parsons ----------

type Parsons = { parsons: { lines: string[]; distractors: { line: string; explain: string }[] }[] };

test("parsons: the first failed check names the wrong lines; the second explains them", async ({ page }) => {
  const item = yamlOf<Parsons>("s02-t04", "formats.yaml").parsons[0];
  await seedSolved(page, []);
  await page.goto("/dev/formats/s02-t04/");
  const T = "format-parsons-0";
  const fmt = page.getByTestId(T);
  await expect(fmt).toBeVisible();

  await fmt.getByTestId(`${T}-check`).click();
  const fail = fmt.getByTestId(`${T}-fail`);
  await expect(fail).toBeVisible({ timeout: 60_000 });
  await expect(fail).toContainText("Check again to get the explanation");
  await expect(fail.getByTestId(`${T}-wrong-line`)).toHaveCount(item.distractors.length);
  for (const d of item.distractors) {
    await expect(fail).toContainText(d.line.trim());
    await expect(fail).not.toContainText(plainText(d.explain).slice(0, 40));
  }

  await fmt.getByTestId(`${T}-check`).click();
  await expect(fail).toContainText("Byte's slips", { timeout: 60_000 });
  for (const d of item.distractors) await expect(fail).toContainText(plainText(d.explain).slice(0, 40));
});

// ---------- 10: badge toast ----------

test("the badge toast closes itself after ~6 s, but not while hovered", async ({ page }) => {
  const t01 = byId("s01-t01");
  // Control timers, so a slow machine can't let the 6 s auto-close fire before we look.
  await page.clock.install();
  await seedSolved(page, []);
  await expect(page.getByTestId("office-map").first()).toBeVisible();
  // Freeze time: from here only our fastForward calls move it, however slow the machine is.
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await seedSolved(page, [t01]);
  const toast = page.getByTestId("badge-toast");
  await expect(toast).toContainText("First Commit");
  await toast.hover();
  await expect(toast).toHaveAttribute("data-paused", "true");
  await page.clock.fastForward(7000);
  await expect(toast).toBeVisible();
  await page.mouse.move(5, 5);
  await page.clock.fastForward(7000);
  await expect(toast).toHaveCount(0);
});

test("with reduced motion the toast doesn't animate and still closes itself", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await seedSolved(page, []);
  await expect(page.getByTestId("office-map").first()).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await seedSolved(page, [byId("s01-t01")]);
  const toast = page.getByTestId("badge-toast");
  await expect(toast).toBeVisible();
  const anim = await toast.evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el.querySelector(".badge-toast-timer")!).animationName]);
  expect(anim).toEqual(["none", "none"]);
  await page.clock.fastForward(7000);
  await expect(toast).toHaveCount(0);
});

// ---------- 11: inline code in quizzes ----------

test("inline `code` in quiz prompts renders as code, with no raw backticks", async ({ page }) => {
  const t = byId("s01-t01");
  const qi = t.questions.findIndex((q) => q.prompt.includes("`"));
  expect(qi).toBeGreaterThanOrEqual(0);
  await seedProgress(page, { [t.id]: { quizDone: false, quizFirstPick: t.questions.map(() => null) } });
  await page.goto(ticketUrl(t.id));
  await openQuizTab(page);
  const q = page.getByTestId(`question-${qi}`);
  await expect(q.locator("p code").first()).toBeVisible();
  expect(await q.locator("p").first().textContent()).not.toContain("`");
  await answerQuiz(page, t.questions);
  await expect(page.getByTestId("quiz-done")).toBeVisible();
});

// ---------- 12: incident logs ----------

async function logsAtEnd(page: Page) {
  return page.getByTestId("incident-logs").evaluate((el) => ({
    atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
    scrolls: el.scrollHeight > el.clientHeight,
    height: el.clientHeight,
  }));
}

test("incident logs open scrolled to the end, where the error is, in a taller box", async ({ page }) => {
  await openFresh(page, "s02-t03");
  await expect(page.getByTestId("incident-logs")).toBeVisible();
  const m = await logsAtEnd(page);
  expect(m.atEnd).toBe(true);
  expect(m.height).toBeGreaterThanOrEqual(150);
  await page.getByTestId("incident-panel").screenshot({ path: "test-results/e2e/playtest2-incident.png" });
});

// ---------- phones: 7, 8, 12 ----------

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("Byte's diff lines wrap: nothing cut off, no sideways scroll", async ({ page }) => {
    await openFresh(page, "s01-t01");
    await revealByteCard(page);
    const lines = page.getByTestId("byte-diff-line");
    expect(await lines.count()).toBeGreaterThan(0);
    for (const line of await lines.all()) {
      const fits = await line.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits).toBe(true);
    }
    // The end of Byte's line (where the missing comma hides) is on screen.
    const replace = yamlOf<Why>("s01-t01", "byte.yaml").suggestion.replace.trim();
    await expect(page.getByTestId("byte-diff")).toContainText(replace);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("debugger: the current line's code is in the card, and the editor shrinks to its code", async ({ page }) => {
    await openFresh(page, "s01-t01");
    await page.getByTestId("goto-code").click();
    await waitForPython(page);
    await runTests(page);
    await page.getByTestId("step-through").first().click();
    const dbg = page.getByTestId("debugger");
    await expect(dbg).toBeVisible({ timeout: 30_000 });
    const code = dbg.getByTestId("debugger-code");
    await expect(code).toBeVisible();
    const current = code.locator("[data-current]");
    await expect(current).toHaveCount(1);
    await expect(current).toContainText(/\d+\s*\S/);
    // The line number in the card matches the one named above it.
    const named = (await dbg.getByText(/line \d+/).first().textContent())!.match(/line (\d+)/)![1];
    await expect(current).toContainText(named);

    // Short file: the editor is sized to it, so the debugger starts on the first screen.
    await expect.poll(async () => (await page.getByTestId("code-panel").boundingBox())!.height).toBeLessThan(450);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect((await dbg.boundingBox())!.y).toBeLessThan(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("incident: a '📜 Logs' chip on the Code step opens the logs, scrolled to the end", async ({ page }) => {
    await openFresh(page, "s02-t03");
    await page.getByTestId("goto-code").click();
    const chip = page.getByTestId("logs-chip");
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("Logs");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("incident-logs")).toBeVisible();
    expect((await logsAtEnd(page)).atEnd).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
