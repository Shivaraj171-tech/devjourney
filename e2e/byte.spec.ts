// "Byte suggests" (accept / reject / edit), the "Ask Byte" prompt cards and the
// human-in-the-loop score. Suggestions and prompts are read from byte.yaml on disk.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import {
  allSeasonTickets,
  editorValue,
  readProgress,
  revealByteCard,
  runTests,
  seedSolved,
  setEditorFile,
  solutionFile,
  ticketUrl,
  trackPageErrors,
  waitForPython,
  type TicketInfo,
} from "./helpers";
import { closeSolvedModal } from "./play";

type ByteYaml = {
  suggestion?: { file: string; find: string; replace: string; correct: boolean; partial?: boolean; explain: string; why?: unknown };
  prompt?: { options: { prompt: string; verdict: string }[]; best: number };
};

const all = allSeasonTickets();
const byId = (id: string) => all.find((t) => t.id === id)!;
const before = (t: TicketInfo) => all.slice(0, all.indexOf(t));
const byteOf = (t: TicketInfo) => load(readFileSync(join(t.dir, "byte.yaml"), "utf-8")) as ByteYaml;
// Seeded tickets are worth 100 XP each (see seedSolved).
const seededXp = (t: TicketInfo) => before(t).length * 100;
// Optional: where to save screenshots for humans (defaults to the e2e output folder).
const SHOTS = process.env.BYTE_SCREENSHOT_DIR ?? "test-results/e2e";

// Pick demo tickets from the content itself, so recalibrating Byte doesn't break the tests:
// the first ticket whose suggestion is wrong, and the first whose suggestion is right.
const hasByte = (t: TicketInfo) => {
  try {
    // These tests cover the plain accept/reject flow; suggestions with a "why"
    // (decide-before-evidence) are tested in formats.spec.ts.
    const sug = byteOf(t).suggestion;
    return sug !== undefined && sug.why === undefined;
  } catch {
    return false;
  }
};
const wrongTicket = all.find((t) => hasByte(t) && byteOf(t).suggestion!.correct === false)!;
// A fully correct one: accepting it makes every check pass (partial ones leave work on purpose).
const rightTicket = all.find((t) => hasByte(t) && byteOf(t).suggestion!.correct === true && !byteOf(t).suggestion!.partial)!;
const promptTicket = byId("s02-t02"); // prompt card, best = option 2

const card = (page: Page) => page.getByTestId("byte-suggestion");

async function xpTotal(page: Page) {
  return Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
}

async function openTicket(page: Page, t: TicketInfo) {
  await seedSolved(page, before(t));
  await page.goto(ticketUrl(t.id));
  await revealByteCard(page);
  await expect(card(page)).toHaveAttribute("data-outcome", "undecided");
}

test("content: the demo tickets have the suggestions these tests rely on", () => {
  expect(byteOf(wrongTicket).suggestion?.correct).toBe(false);
  expect(byteOf(rightTicket).suggestion?.correct).toBe(true);
  expect(byteOf(promptTicket).prompt?.options.length).toBeGreaterThanOrEqual(2);
});

test("accepting a wrong suggestion: the next run fails and the lesson is shown", async ({ page }) => {
  const errors = trackPageErrors(page);
  const t = wrongTicket;
  const sug = byteOf(t).suggestion!;
  await openTicket(page, t);
  await expect(card(page)).toContainText("autocomplete"); // Season 1: Byte is still autocomplete
  await expect(page.getByTestId("byte-diff")).toContainText(sug.find.trim());
  await expect(page.getByTestId("byte-diff")).toContainText(sug.replace.trim());
  await page.screenshot({ path: `${SHOTS}/byte-suggestion-card.png` });
  const xp = await xpTotal(page);
  expect(xp).toBe(seededXp(t));

  await waitForPython(page);
  await page.getByTestId("byte-accept").click();
  // The code is applied to the learner's file, and Monaco shows it.
  await expect.poll(() => editorValue(page, t.id, sug.file)).toContain(sug.replace);
  expect((await readProgress(page)).tickets[t.id].code[sug.file]).toContain(sug.replace);
  await expect(card(page)).toHaveAttribute("data-outcome", "pending");
  await expect(page.getByTestId("byte-outcome")).toContainText("run the tests");
  await expect(page.getByTestId("byte-accept")).toHaveCount(0);

  await runTests(page);
  await expect(page.getByTestId("run-summary")).not.toContainText("All checks passed");
  await expect(card(page)).toHaveAttribute("data-outcome", "waved-through");
  await expect(page.getByTestId("byte-outcome")).toContainText("you accepted it without checking");
  // The suggestion's own explanation is shown (Markdown backticks are rendered away).
  await expect(page.getByTestId("byte-outcome")).toContainText(sug.explain.replace(/`/g, "").slice(0, 25));
  await page.screenshot({ path: `${SHOTS}/byte-waved-through.png` });
  expect(await xpTotal(page)).toBe(xp); // no bonus, no penalty

  const p = await readProgress(page);
  expect(p.tickets[t.id].byteSuggestion).toMatchObject({ decision: "accept", correct: false });

  // The ticket can still be finished normally.
  await setEditorFile(page, t.id, sug.file, solutionFile(t, sug.file));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await closeSolvedModal(page, "PR merged!");
  await expect(card(page)).toHaveAttribute("data-outcome", "waved-through");

  await page.goto("/");
  await expect(page.getByTestId("hitl-caught")).toHaveText("0/1");
  await expect(page.getByTestId("hitl-waved")).toHaveText("1");
  expect(errors).toEqual([]);
});

test("rejecting a wrong suggestion counts as caught (+15 XP) on the HQ and leaderboard", async ({ page }) => {
  const t = wrongTicket;
  const sug = byteOf(t).suggestion!;
  await openTicket(page, t);
  const xp = await xpTotal(page);
  await page.getByTestId("byte-reject").click();
  await expect(card(page)).toHaveAttribute("data-outcome", "caught");
  await expect(page.getByTestId("byte-outcome")).toContainText("Caught it! +15 XP");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 15} XP`);
  await page.screenshot({ path: `${SHOTS}/byte-caught.png` });
  // Rejecting leaves the learner's code alone.
  const p = await readProgress(page);
  expect(p.tickets[t.id].code[sug.file]).toBeUndefined();
  expect(p.tickets[t.id].byteSuggestion).toMatchObject({ decision: "reject", correct: false });

  // Still decided after a reload.
  await page.reload();
  await expect(card(page)).toHaveAttribute("data-outcome", "caught");
  await expect(page.getByTestId("byte-reject")).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByTestId("hitl-score")).toBeVisible();
  await expect(page.getByTestId("hitl-caught")).toHaveText("1/1");
  await expect(page.getByTestId("hitl-summary")).toContainText("Caught 1 of 1 of Byte's bugs");
  await page.getByTestId("hitl-score").screenshot({ path: `${SHOTS}/byte-hq-score.png` });
  await page.goto("/leaderboard/");
  await expect(page.getByTestId("hitl-summary")).toContainText("Caught 1 of 1 of Byte's bugs");
});

test("'Edit it myself' on a wrong suggestion: fixing it until the tests pass counts as caught", async ({ page }) => {
  const t = wrongTicket;
  const sug = byteOf(t).suggestion!;
  await openTicket(page, t);
  const xp = await xpTotal(page);
  await waitForPython(page);
  await page.getByTestId("byte-edit").click();
  await expect.poll(() => editorValue(page, t.id, sug.file)).toContain(sug.replace);
  await expect(page.getByTestId("byte-outcome")).toContainText("Your turn");
  await runTests(page);
  await expect(card(page)).toHaveAttribute("data-outcome", "pending");
  await setEditorFile(page, t.id, sug.file, solutionFile(t, sug.file));
  await runTests(page);
  await closeSolvedModal(page, "PR merged!");
  await expect(card(page)).toHaveAttribute("data-outcome", "caught");
  const p = await readProgress(page);
  expect(await xpTotal(page)).toBe(xp + p.tickets[t.id].solveXp + 15);
});

test("accepting a correct suggestion: the tests pass and it counts as trusted correctly", async ({ page }) => {
  const t = rightTicket;
  const sug = byteOf(t).suggestion!;
  await openTicket(page, t);
  await waitForPython(page);
  await page.getByTestId("byte-accept").click();
  await expect.poll(() => editorValue(page, t.id, sug.file)).toContain(sug.replace);
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await closeSolvedModal(page, "PR merged!");
  await expect(card(page)).toHaveAttribute("data-outcome", "trusted");
  await expect(page.getByTestId("byte-outcome")).toContainText("Trusted correctly, +15 XP");
  await page.screenshot({ path: `${SHOTS}/byte-trusted.png` });
  const p = await readProgress(page);
  expect(p.tickets[t.id].solved).toBe(true);
  expect(await xpTotal(page)).toBe(seededXp(t) + p.tickets[t.id].solveXp + 15);
});

test("Ask Byte: picking the best prompt first earns XP; other prompts can be compared", async ({ page }) => {
  const errors = trackPageErrors(page);
  const t = promptTicket;
  const prompt = byteOf(t).prompt!;
  await seedSolved(page, before(t));
  await page.goto(ticketUrl(t.id));
  const xp = await xpTotal(page);
  await page.getByRole("tab", { name: /Ask Byte/ }).click();
  await expect(page.getByTestId("ask-byte")).toBeVisible();
  await expect(page.getByTestId("prompt-response")).toHaveCount(0);

  await page.getByTestId(`prompt-option-${prompt.best}`).click();
  await expect(page.getByTestId("prompt-response")).toBeVisible();
  await expect(page.getByTestId("prompt-verdict")).toContainText("Great prompt");
  await expect(page.getByTestId("prompt-result")).toContainText("Best prompt on the first try! +10 XP");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 10} XP`);
  await page.screenshot({ path: `${SHOTS}/byte-ask-byte.png` });

  // Comparing another prompt shows its answer but doesn't change the first pick.
  const other = prompt.best === 0 ? 1 : 0;
  await page.getByTestId(`prompt-option-${other}`).click();
  await expect(page.getByTestId("prompt-verdict")).not.toContainText("Great prompt");
  await expect(page.getByTestId("prompt-option-" + other)).toHaveAttribute("aria-pressed", "true");
  const p = await readProgress(page);
  expect(p.tickets[t.id].bytePrompt).toEqual({ firstPick: prompt.best, best: true });
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 10} XP`);

  await page.goto("/");
  await expect(page.getByTestId("hitl-prompts")).toHaveText("1/1");
  expect(errors).toEqual([]);
});

test("Ask Byte: a weaker first pick earns nothing and shows which prompt was best", async ({ page }) => {
  const t = promptTicket;
  const prompt = byteOf(t).prompt!;
  const worse = prompt.options.findIndex((o) => o.verdict !== "good");
  await seedSolved(page, before(t));
  await page.goto(ticketUrl(t.id));
  const xp = await xpTotal(page);
  await page.getByRole("tab", { name: /Ask Byte/ }).click();
  await page.getByTestId(`prompt-option-${worse}`).click();
  await expect(page.getByTestId("prompt-result")).toContainText(`The best prompt was #${prompt.best + 1}`);
  await page.getByTestId(`prompt-option-${prompt.best}`).click();
  await expect(page.getByTestId("prompt-verdict")).toContainText("Great prompt");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp} XP`);
});

test.describe("phone viewport", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("Byte's card and the Ask Byte tab fit a phone screen", async ({ page }) => {
    await openTicket(page, byId("s02-t04"));
    await expect(page.getByTestId("byte-accept")).toBeVisible();
    await page.getByTestId("byte-suggestion").screenshot({ path: `${SHOTS}/byte-card-390.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await seedSolved(page, before(promptTicket));
    await page.goto(ticketUrl(promptTicket.id));
    await page.getByRole("tab", { name: /Ask Byte/ }).click();
    await page.getByTestId("prompt-option-0").click();
    await expect(page.getByTestId("prompt-response")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: `${SHOTS}/byte-ask-byte-390.png`, fullPage: true });
  });
});
