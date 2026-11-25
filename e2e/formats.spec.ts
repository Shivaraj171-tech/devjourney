// Extra task formats (formats.yaml): "Predict the output", "Break Byte's code" and
// Parsons puzzles, tried on the dev-only preview route /dev/formats/<ticket id>/.
// Also Byte's "decide before evidence" (byte.yaml `why`) on the real ticket page.
// Python runs for real in Pyodide. Content is read from disk, so the tests follow it.
import { mkdirSync, readFileSync } from "node:fs";
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
  ticketUrl,
  trackPageErrors,
  waitForPython,
  type TicketInfo,
} from "./helpers";
import { closeSolvedModal } from "./play";

type FormatsYaml = {
  predict?: { answer: string; choices?: string[] }[];
  break_it?: { normal_input: string; example_input: string; miss?: string; call: string }[];
  parsons?: { lines: string[]; distractors: { line: string; explain: string }[] }[];
};
type ByteYaml = { suggestion: { file: string; replace: string; correct: boolean; partial?: boolean; why: { choices: string[]; answer: number } } };

const all = allSeasonTickets();
const byId = (id: string) => all.find((t) => t.id === id)!;
const before = (t: TicketInfo) => all.slice(0, all.indexOf(t));
const formatsOf = (id: string) => load(readFileSync(join(byId(id).dir, "formats.yaml"), "utf-8")) as FormatsYaml;
const byteOf = (id: string) => load(readFileSync(join(byId(id).dir, "byte.yaml"), "utf-8")) as ByteYaml;
const devUrl = (id: string) => `/dev/formats/${id}/`;
const trimEnd = (s: string) => s.replace(/\n+$/, "");

const SHOTS = process.env.FORMATS_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

async function xpTotal(page: Page) {
  return Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
}

/** Open the dev preview with fresh progress (onboarding done, nothing solved). */
async function openPreview(page: Page, id: string) {
  await seedSolved(page, []);
  await page.goto(devUrl(id));
  await expect(page.getByTestId("task-formats")).toBeVisible();
}

test("content: the preview tickets have the formats these tests rely on", () => {
  expect(formatsOf("s01-t02").predict?.[0].choices?.length).toBeGreaterThanOrEqual(2);
  expect(formatsOf("s01-t05").predict?.[0].choices).toBeUndefined();
  expect(formatsOf("s01-t09").break_it?.length).toBe(1);
  expect(formatsOf("s04-t02").break_it?.length).toBe(1);
  expect(formatsOf("s03-t02").parsons?.length).toBe(1);
  for (const id of ["s01-t02", "s01-t05", "s03-t02"]) expect(byteOf(id).suggestion.why.choices).toHaveLength(3);
  // There is at least one right and one wrong suggestion with a "why" to demo.
  expect(byteOf(rightWhyId).suggestion.correct).toBe(true);
  expect(byteOf(wrongWhyId).suggestion.correct).toBe(false);
});

test("predict (multiple choice): Run only after locking in; the real output matches; +10 XP", async ({ page }) => {
  const errors = trackPageErrors(page);
  const item = formatsOf("s01-t02").predict![0];
  await openPreview(page, "s01-t02");
  const card = page.getByTestId("format-predict-0");
  const xp = await xpTotal(page);

  // No way to run before predicting.
  await expect(card.getByTestId("format-predict-0-run")).toHaveCount(0);
  await expect(card.getByTestId("format-predict-0-lock")).toBeDisabled();
  const answer = trimEnd(item.answer);
  const right = item.choices!.findIndex((c) => trimEnd(c) === answer);
  await card.getByTestId(`format-predict-0-choice-${right}`).click();
  await expect(card.getByTestId(`format-predict-0-choice-${right}`)).toHaveAttribute("aria-checked", "true");
  await card.getByTestId("format-predict-0-lock").click();

  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 10} XP`);
  await card.getByTestId("format-predict-0-run").click();
  await expect(card.getByTestId("format-predict-0-actual")).toContainText("333.3333333333333", { timeout: 60_000 });
  await expect(card.getByTestId("format-predict-0-actual")).toHaveText(answer);
  await expect(card.getByTestId("format-predict-0-prediction")).toHaveText(answer);
  await expect(card.getByTestId("format-predict-0-verdict")).toContainText("Spot on! +10 XP");
  await card.screenshot({ path: `${SHOTS}/formats-predict.png` });

  const p = await readProgress(page);
  expect(p.tickets["s01-t02"].formats["predict:0"]).toMatchObject({ kind: "predict", done: true, correct: true, xp: 10 });
  // Saved: still locked in after a reload, no double XP.
  await page.reload();
  await expect(page.getByTestId("format-predict-0")).toHaveAttribute("data-done", "true");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 10} XP`);
  expect(errors).toEqual([]);
});

test("predict (free text): a wrong guess costs nothing and shows the real output", async ({ page }) => {
  await openPreview(page, "s01-t05");
  const card = page.getByTestId("format-predict-0");
  const xp = await xpTotal(page);
  await card.getByTestId("format-predict-0-input").fill("[1250, 299]\n2");
  await card.getByTestId("format-predict-0-lock").click();
  await card.getByTestId("format-predict-0-run").click();
  await expect(card.getByTestId("format-predict-0-actual")).toHaveText("None\n2", { timeout: 60_000 });
  await expect(card.getByTestId("format-predict-0-verdict")).toContainText("Not quite");
  await expect(card.getByTestId("format-predict-0-verdict")).toContainText(".append()");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp} XP`);
  expect((await readProgress(page)).tickets["s01-t05"].formats["predict:0"]).toMatchObject({ correct: false, xp: 0 });
});

test("break it: Byte's own input meets the spec, a bad input is explained, the counterexample wins +15 XP", async ({ page }) => {
  const errors = trackPageErrors(page);
  const item = formatsOf("s01-t09").break_it![0];
  await openPreview(page, "s01-t09");
  const card = page.getByTestId("format-break-it-0");
  const input = card.getByTestId("format-break-it-0-input");
  const tries = card.getByTestId("format-break-it-0-tries");
  const xp = await xpTotal(page);

  await input.fill(item.normal_input);
  await card.getByTestId("format-break-it-0-try").click();
  await expect(tries.locator("li").first()).toContainText("meets the spec", { timeout: 60_000 });
  await expect(tries.locator("li").first()).toContainText(item.miss!);

  await input.fill("1000; 3");
  await card.getByTestId("format-break-it-0-try").click();
  await expect(tries.locator("li").first()).toContainText("plain Python values");
  // Code instead of values is refused, not run.
  await input.fill("__import__('os').getcwd()");
  await card.getByTestId("format-break-it-0-try").click();
  await expect(tries.locator("li").first()).toContainText("plain Python values");
  await expect(card).toHaveAttribute("data-done", "false");

  await input.fill(item.example_input);
  await card.getByTestId("format-break-it-0-try").click();
  await expect(card.getByTestId("format-break-it-0-success")).toContainText("You broke it! +15 XP");
  await expect(card.getByTestId("format-break-it-0-success")).toContainText("split_bill(1000, 3)");
  await expect(tries.locator("li").first()).toContainText("[333, 333, 333]");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 15} XP`);
  await card.screenshot({ path: `${SHOTS}/formats-break-it.png` });

  const rec = (await readProgress(page)).tickets["s01-t09"].formats["break_it:0"];
  // Byte's own input counted as one try; the invalid ones didn't.
  expect(rec).toMatchObject({ kind: "break_it", done: true, xp: 15, attempts: 2, input: item.example_input });
  expect(errors).toEqual([]);
});

test("a ticket with two formats: predict and break it (first_name) side by side", async ({ page }) => {
  const item = formatsOf("s04-t02").break_it![0];
  await openPreview(page, "s04-t02");
  await expect(page.getByTestId("format-predict-0")).toBeVisible();
  const card = page.getByTestId("format-break-it-0");
  await card.getByTestId("format-break-it-0-input").fill(item.normal_input);
  await card.getByTestId("format-break-it-0-try").click();
  await expect(card.getByTestId("format-break-it-0-tries")).toContainText("meets the spec", { timeout: 60_000 });
  await card.getByTestId("format-break-it-0-input").fill(item.example_input);
  await card.getByTestId("format-break-it-0-try").click();
  await expect(card.getByTestId("format-break-it-0-success")).toContainText("You broke it!");
  await expect(card.getByTestId("format-break-it-0-tries")).toContainText("returned ''");
});

/** Block id per line text, as shown in the Parsons program list. */
async function blockIds(page: Page, testId: string): Promise<Map<string, number>> {
  const rows = page.getByTestId(testId).getByTestId(`${testId}-line`);
  const ids = new Map<string, number>();
  for (const row of await rows.all()) {
    ids.set((await row.locator("code").textContent()) ?? "", Number(await row.getAttribute("data-block")));
  }
  return ids;
}

async function programOrder(page: Page, testId: string): Promise<number[]> {
  const rows = page.getByTestId(testId).getByTestId(`${testId}-line`);
  return Promise.all((await rows.all()).map(async (r) => Number(await r.getAttribute("data-block"))));
}

test("parsons: distractors explain themselves; ordering with the keyboard; solved in Python", async ({ page }) => {
  const errors = trackPageErrors(page);
  const item = formatsOf("s03-t02").parsons![0];
  const T = "format-parsons-0";
  await openPreview(page, "s03-t02");
  const card = page.getByTestId(T);
  const xp = await xpTotal(page);
  const ids = await blockIds(page, T);
  expect(ids.size).toBe(item.lines.length + item.distractors.length);
  // Shuffled: the lines don't arrive in the right order.
  const shownText = [...ids.keys()].filter((t) => item.lines.includes(t));
  expect(shownText).not.toEqual(item.lines);
  await card.screenshot({ path: `${SHOTS}/formats-parsons-start.png` });

  // Checking the jumbled program fails, and the distractors used explain themselves.
  await card.getByTestId(`${T}-check`).click();
  await expect(card.getByTestId(`${T}-fail`)).toBeVisible({ timeout: 60_000 });
  for (const d of item.distractors) await expect(card.getByTestId(`${T}-fail`)).toContainText(d.line.trim());

  // Take the distractors out.
  for (const d of item.distractors) await card.getByTestId(`${T}-remove-${ids.get(d.line)}`).click();
  await expect(card.getByTestId(`${T}-unused`).locator("li")).toHaveCount(item.distractors.length);

  // Order the lines with the ↑ buttons, pressing Enter on a focused button (keyboard only).
  const target = item.lines.map((l) => ids.get(l)!);
  for (let k = 0; k < target.length; k++) {
    const id = target[k];
    let pos = (await programOrder(page, T)).indexOf(id);
    if (pos > k) {
      await card.getByTestId(`${T}-up-${id}`).focus();
      while (pos > k) {
        await page.keyboard.press("Enter");
        pos--;
        await expect.poll(() => programOrder(page, T).then((o) => o.indexOf(id))).toBe(pos);
      }
      // Focus stays on the moved line's button, so Enter can be pressed again.
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
      expect(focused === `${T}-up-${id}` || focused === `${T}-down-${id}`).toBe(true);
    }
  }
  expect(await programOrder(page, T)).toEqual(target);

  await card.getByTestId(`${T}-check`).click();
  await expect(card.getByTestId(`${T}-success`)).toContainText("It works! +15 XP", { timeout: 60_000 });
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 15} XP`);
  await card.screenshot({ path: `${SHOTS}/formats-parsons-solved.png` });
  const rec = (await readProgress(page)).tickets["s03-t02"].formats["parsons:0"];
  expect(rec).toMatchObject({ kind: "parsons", done: true, attempts: 2, xp: 15, order: target });

  // The solved order is saved.
  await page.reload();
  await expect(page.getByTestId(T)).toHaveAttribute("data-done", "true");
  expect(await programOrder(page, T)).toEqual(target);
  expect(errors).toEqual([]);
});

test.describe("phone viewport", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("every format fits a 390px screen", async ({ page }) => {
    for (const id of ["s01-t02", "s04-t02", "s02-t04"]) {
      await openPreview(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await page.screenshot({ path: `${SHOTS}/formats-${id}-390.png`, fullPage: true });
    }
    // Still fits once results are showing.
    const card = page.getByTestId("format-parsons-0");
    await card.getByTestId("format-parsons-0-check").click();
    await expect(card.getByTestId("format-parsons-0-fail")).toBeVisible({ timeout: 60_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: `${SHOTS}/formats-parsons-fail-390.png`, fullPage: true });
  });
});

// ---------- Byte: decide before evidence (byte.yaml `why`) ----------

const byteCard = (page: Page) => page.getByTestId("byte-suggestion");

// Pick demo tickets from the content, so recalibrating Byte doesn't break these tests:
// the first suggestion with a "why" that is wrong, and the first that is right.
const withWhy = all.filter((t) => {
  try {
    return byteOf(t.id).suggestion?.why !== undefined;
  } catch {
    return false;
  }
});
const wrongWhyId = withWhy.find((t) => !byteOf(t.id).suggestion.correct)!.id;
// Fully correct (not partial), so accepting it makes every check pass.
const rightWhyId = withWhy.find((t) => byteOf(t.id).suggestion.correct && !byteOf(t.id).suggestion.partial)!.id;

async function openTicketWithWhy(page: Page, id: string) {
  const t = byId(id);
  await seedSolved(page, before(t));
  await page.goto(ticketUrl(t.id));
  await revealByteCard(page);
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "undecided");
  // One question at a time: the reason is asked once a call is picked (UI audit flaw 5).
  await expect(page.getByTestId("byte-why")).toHaveCount(0);
}

test("why: reject + the right reason, locked in together, is caught (+20 XP)", async ({ page }) => {
  const errors = trackPageErrors(page);
  const why = byteOf("s01-t02").suggestion.why;
  await openTicketWithWhy(page, "s01-t02");
  const xp = await xpTotal(page);
  const lock = page.getByTestId("byte-lock");
  await expect(lock).toHaveCount(0);

  // A call alone doesn't decide anything: it opens the "why?" step.
  await page.getByTestId("byte-reject").click();
  await expect(page.getByTestId("byte-reject")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("byte-why")).toBeVisible();
  await expect(lock).toBeDisabled();
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "undecided");
  expect((await readProgress(page)).tickets["s01-t02"]?.byteSuggestion).toBeUndefined();

  await page.getByTestId(`byte-why-${why.answer}`).click();
  await expect(page.getByTestId(`byte-why-${why.answer}`)).toHaveAttribute("aria-checked", "true");
  await byteCard(page).screenshot({ path: `${SHOTS}/byte-why-picked.png` });
  await lock.click();

  await expect(byteCard(page)).toHaveAttribute("data-outcome", "caught");
  await expect(page.getByTestId("byte-outcome")).toContainText("Caught it! +20 XP");
  await expect(page.getByTestId("byte-reason")).toHaveAttribute("data-reason", "right");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 20} XP`);
  await byteCard(page).screenshot({ path: `${SHOTS}/byte-why-caught.png` });
  expect((await readProgress(page)).tickets["s01-t02"].byteSuggestion).toMatchObject({
    decision: "reject",
    correct: false,
    reason: why.answer,
    reasonCorrect: true,
  });
  expect(errors).toEqual([]);
});

test("why: the right call with the wrong reason earns nothing and shows the real reason", async ({ page }) => {
  const why = byteOf(wrongWhyId).suggestion.why;
  await openTicketWithWhy(page, wrongWhyId);
  const xp = await xpTotal(page);
  const wrong = why.answer === 0 ? 1 : 0;
  await page.getByTestId("byte-reject").click();
  await page.getByTestId(`byte-why-${wrong}`).click();
  await page.getByTestId("byte-lock").click();
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "caught");
  await expect(page.getByTestId("byte-outcome")).toContainText("Right call, shaky reason");
  await expect(page.getByTestId("byte-reason")).toHaveAttribute("data-reason", "wrong");
  await expect(page.getByTestId("byte-reason")).toContainText(why.choices[why.answer].replace(/`/g, ""));
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp} XP`);
});

test("why: accept + reason applies Byte's code only after locking in; the run reveals the verdict", async ({ page }) => {
  const id = rightWhyId;
  const sug = byteOf(id).suggestion;
  await openTicketWithWhy(page, id);
  await waitForPython(page);
  await page.getByTestId("byte-accept").click();
  // Not applied yet: the call isn't locked in.
  expect(await editorValue(page, id, sug.file)).not.toContain(sug.replace);
  await page.getByTestId(`byte-why-${sug.why.answer}`).click();
  await page.getByTestId("byte-lock").click();
  await expect.poll(() => editorValue(page, id, sug.file)).toContain(sug.replace);
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "pending");
  // The reason's verdict is not revealed before the evidence.
  await expect(page.getByTestId("byte-reason")).toHaveCount(0);

  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  await closeSolvedModal(page, "PR merged!");
  await expect(byteCard(page)).toHaveAttribute("data-outcome", "trusted");
  await expect(page.getByTestId("byte-outcome")).toContainText("Trusted correctly, +10 XP");
  await expect(page.getByTestId("byte-reason")).toHaveAttribute("data-reason", "right");
  const p = await readProgress(page);
  // Earlier tickets are seeded as solved at 100 XP each (see seedSolved).
  expect(await xpTotal(page)).toBe(before(byId(id)).length * 100 + p.tickets[id].solveXp + 10);
});
