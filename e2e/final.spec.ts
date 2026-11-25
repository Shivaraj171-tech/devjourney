// The final exam ("Byte's Week Alone", an off-chain season with `final: true`), the
// 12-question skills check (baseline + final) and the "Human in the loop: verified"
// certificate. Content is read from disk, so the tests follow it.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import {
  allSeasonTickets,
  finalSeasonTickets,
  PROGRESS_KEY,
  readProgress,
  seedSolved,
  ticketUrl,
  trackPageErrors,
  type TicketInfo,
} from "./helpers";
import { playTicket } from "./play";

type SkillsItem = { id: string; kind: string; choices: string[]; answer: number };
const SKILLS = (load(readFileSync(join(__dirname, "..", "content", "assessment", "skills-check.yaml"), "utf-8")) as { items: SkillsItem[] }).items;
const byItemId = new Map(SKILLS.map((i) => [i.id, i]));

const onChain = allSeasonTickets();
const finals = finalSeasonTickets();

const SHOTS = process.env.FINAL_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string, fullPage = true) => page.screenshot({ path: join(SHOTS, name), fullPage });

/** Mark tickets solved on top of the saved progress (keeps the skills check), then reload. */
async function addSolved(page: Page, tickets: TicketInfo[]) {
  await page.evaluate(
    ({ key, ids }) => {
      const p = JSON.parse(window.localStorage.getItem(key)!);
      const now = new Date().toISOString();
      for (const id of ids) {
        p.tickets[id] = {
          code: {}, runs: 1, hintsUsed: 0, solved: true, solvedAt: now, solveXp: 100,
          quizFirstPick: [], quizDone: true, quizFirstTryCorrect: 0, quizXp: 0,
        };
      }
      window.localStorage.setItem(key, JSON.stringify(p));
    },
    { key: PROGRESS_KEY, ids: tickets.map((t) => t.id) },
  );
  await page.reload();
}

/** Take the skills check from its intro: the first `right` questions (as shown) right, the rest wrong. */
async function takeSkillsCheck(page: Page, right: number) {
  await page.getByTestId("skills-start").click();
  for (let n = 0; n < SKILLS.length; n++) {
    const q = page.getByTestId("skills-question");
    await expect(page.getByTestId("skills-position")).toHaveText(`Question ${n + 1} of ${SKILLS.length}`);
    const item = byItemId.get((await q.getAttribute("data-item-id"))!)!;
    const pick = n < right ? item.answer : (item.answer + 1) % item.choices.length;
    await expect(page.getByTestId("skills-next")).toBeDisabled();
    await q.locator(`[data-testid="skills-choice"][data-choice="${pick}"]`).click();
    await expect(q.locator(`[data-choice="${pick}"]`)).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("skills-next").click();
  }
  await expect(page.getByTestId("skills-result")).toBeVisible();
}

test("content: the final exam is an off-chain season of three exam tickets", () => {
  expect(finals.map((t) => t.type)).toEqual(["review", "incident", "feature"]);
  expect(SKILLS).toHaveLength(12);
  expect(new Set(SKILLS.map((i) => i.kind))).toEqual(new Set(["predict", "catch_input", "spot_line", "pick_answer"]));
  // allSeasonTickets() is the main story only.
  expect(onChain.some((t) => finals.some((f) => f.id === t.id))).toBe(false);
});

test("final exam: baseline, three no-hint tickets, final check, certificate", async ({ page, context }) => {
  test.setTimeout(6 * 60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = trackPageErrors(page);

  // ---------- day 1: the baseline is offered once ticket 1 is merged (not in minute one) ----------
  await seedSolved(page, []);
  await expect(page.getByTestId("skills-card")).toHaveCount(0);
  await seedSolved(page, [onChain[0]]);
  const card = page.getByTestId("skills-card");
  await expect(card).toHaveAttribute("data-state", "offer-baseline");
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "locked");
  await expect(page.getByTestId("final-exam")).toContainText("Final exam");
  for (const t of finals) await expect(page.getByTestId(`exam-room-${t.id}`)).toHaveAttribute("data-state", "locked");
  await shot(page, "01-hq-baseline-offer.png", false);

  await card.getByTestId("skills-card-start").click();
  await expect(page.getByTestId("skills-intro")).toContainText("Baseline");
  await shot(page, "02-skills-intro.png");
  await page.getByTestId("skills-start").click();
  await expect(page.getByTestId("skills-question")).toBeVisible();
  await shot(page, "03-skills-question.png");
  await page.goto("/skills-check/"); // leaving mid-way saves nothing
  await takeSkillsCheck(page, 5);
  await expect(page.getByTestId("skills-comparison")).toHaveText("Baseline 5/12");
  // The baseline doesn't reveal the answers (the final is a fair re-test).
  await expect(page.getByTestId("skills-review")).toHaveCount(0);
  await shot(page, "04-skills-baseline-result.png");
  let p = await readProgress(page);
  expect(p.skillsCheck.baseline.score).toBe(5);
  expect(Object.keys(p.skillsCheck.baseline.answers)).toHaveLength(12);

  // Taken once: revisiting shows the result, not a new attempt.
  await page.goto("/skills-check/");
  await expect(page.getByTestId("skills-comparison")).toHaveText("Baseline 5/12");
  await page.goto("/");
  await expect(card).toHaveAttribute("data-state", "baseline-done");
  await expect(page.getByTestId("skills-card-score")).toHaveText("Baseline 5/12");

  // ---------- the whole main story is done: the final exam opens ----------
  await addSolved(page, onChain);
  for (const t of onChain) await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", "done");
  const exam = page.getByTestId("final-exam");
  await expect(exam).toHaveAttribute("data-state", "open");
  await expect(exam).toHaveAttribute("data-expanded", "true");
  await expect(page.getByTestId(`exam-room-${finals[0].id}`)).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId(`exam-room-${finals[0].id}`)).toContainText("No hints");
  await expect(page.getByTestId(`exam-room-${finals[1].id}`)).toHaveAttribute("data-state", "locked");
  await expect(page.getByTestId("today-card")).toContainText("Final exam");
  await expect(page.getByTestId("continue")).toHaveAttribute("href", new RegExp(`/ticket/${finals[0].id}/?$`));
  await expect(card).toHaveAttribute("data-state", "offer-final");
  await exam.scrollIntoViewIfNeeded();
  await shot(page, "05-hq-final-exam-open.png");

  // ---------- the three exam tickets: no hints, no lesson, no Byte, no concept chip ----------
  for (const t of finals) {
    await test.step(`${t.id} (${t.type})`, async () => {
      await page.goto(ticketUrl(t.id));
      await expect(page.getByTestId("exam-banner")).toContainText("Exam mode");
      await expect(page.getByTestId("hints-toggle")).toHaveCount(0);
      await expect(page.getByTestId("lesson")).toHaveCount(0);
      await expect(page.getByTestId("byte-suggestion")).toHaveCount(0);
      await expect(page.getByTestId("task-formats")).toHaveCount(0);
      await expect(page.getByText(/^New: /)).toHaveCount(0);
      await expect(page.getByRole("tab", { name: /Ask Byte/ })).toHaveCount(0);
      await shot(page, `06-exam-${t.slug}.png`, false);
      await playTicket(page, t);
    });
  }

  // The certificate also needs the final check.
  await page.goto("/certificate/");
  await expect(page.getByTestId("certificate-locked")).toContainText("The final skills check");

  // ---------- the final skills check ----------
  await page.goto("/");
  await expect(card).toHaveAttribute("data-state", "offer-final");
  for (const t of finals) await expect(page.getByTestId(`exam-room-${t.id}`)).toHaveAttribute("data-state", "done");
  await card.getByTestId("skills-card-start").click();
  await expect(page.getByTestId("skills-intro")).toContainText("Your baseline was 5/12");
  await takeSkillsCheck(page, 11);
  await expect(page.getByTestId("skills-comparison")).toHaveText("Baseline 5/12 → Final 11/12");
  await expect(page.getByTestId("skills-review").locator("li")).toHaveCount(12);
  await shot(page, "07-skills-final-result.png");
  p = await readProgress(page);
  expect(p.skillsCheck.final.score).toBe(11);

  // ---------- HQ, performance review, certificate ----------
  await page.goto("/");
  await expect(card).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("skills-card-score")).toHaveText("Baseline 5/12 → Final 11/12");
  await expect(page.getByTestId("certificate-link")).toBeVisible();

  await page.goto("/review/s99/");
  await expect(page.getByTestId("performance-review")).toContainText("Final exam");
  await expect(page.getByTestId("review-skills-line")).toHaveText("Baseline 5/12 → Final 11/12");
  await page.getByTestId("review-skills-share").click();
  await expect(page.getByTestId("review-skills-share")).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^My DevJourney skills check: Baseline 5\/12 → Final 11\/12 \(\+6\)/);
  await shot(page, "08-review-final.png");

  await page.goto("/certificate/");
  const cert = page.getByTestId("certificate");
  await expect(cert).toContainText("Human in the loop: verified");
  await expect(cert).toContainText("Byte's Week Alone");
  await expect(page.getByTestId("certificate-skills")).toHaveText("Baseline 5/12 → Final 11/12");
  await expect(page.getByTestId("certificate-scores")).toContainText("3/3 problems found");
  await expect(page.getByTestId("certificate-date")).toContainText(String(new Date().getFullYear()));
  await expect(page.getByTestId("certificate-name")).toHaveText("Your name here");
  await page.getByLabel("Name on the certificate").fill("Ana Lucia");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("certificate-name")).toHaveText("Ana Lucia");
  await page.getByTestId("certificate-share").click();
  await expect(page.getByTestId("certificate-share")).toContainText("Copied");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^Ana Lucia passed "Byte's Week Alone"/);
  expect(text).toContain("Human in the loop: verified");
  expect(text).toMatch(/http:\/\/127\.0\.0\.1:\d+\/$/);
  await shot(page, "09-certificate.png");

  // Printable: the top bar is hidden on paper.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("header").first()).toBeHidden();
  await shot(page, "10-certificate-print.png");
  await page.emulateMedia({ media: "screen" });
  expect(errors).toEqual([]);
});

test("the baseline can be skipped, and the exam is locked until the main story is done", async ({ page }) => {
  await seedSolved(page, [onChain[0]]); // the baseline is offered after ticket 1
  await page.getByTestId("skills-card-skip").click();
  await expect(page.getByTestId("skills-card")).toHaveCount(0);
  expect((await readProgress(page)).skillsCheck.baselineSkipped).toBe(true);

  // The final exam's first ticket waits for the last on-chain ticket.
  await page.goto(ticketUrl(finals[0].id));
  await expect(page.getByRole("heading", { name: /still in the backlog/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to previous ticket" })).toHaveAttribute(
    "href",
    new RegExp(`/ticket/${onChain[onChain.length - 1].id}/?$`),
  );
  await page.goto("/certificate/");
  await expect(page.getByTestId("certificate-locked")).toBeVisible();

  // Once the story is done, the final check is offered even without a baseline.
  await page.goto("/");
  await addSolved(page, onChain);
  await expect(page.getByTestId("skills-card")).toHaveAttribute("data-state", "offer-final");
  await page.goto("/skills-check/");
  await expect(page.getByTestId("skills-intro")).toContainText("skipped the baseline");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("skills check and certificate fit 390px", async ({ page }) => {
    await seedSolved(page, []);
    await page.goto("/skills-check/");
    await page.getByTestId("skills-start").click();
    // Walk to a pick_answer question (code answers) and check nothing scrolls sideways.
    for (let n = 0; n < SKILLS.length; n++) {
      const q = page.getByTestId("skills-question");
      const item = byItemId.get((await q.getAttribute("data-item-id"))!)!;
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      if (item.kind === "pick_answer") await shot(page, "11-phone-pick-answer.png");
      await q.locator(`[data-choice="${item.answer}"]`).click();
      await page.getByTestId("skills-next").click();
    }
    await expect(page.getByTestId("skills-comparison")).toHaveText("Baseline 12/12");
    await addSolved(page, [...onChain, ...finals]);
    await page.evaluate((key) => {
      const p = JSON.parse(window.localStorage.getItem(key)!);
      p.skillsCheck.final = { ...p.skillsCheck.baseline, takenAt: new Date().toISOString() };
      window.localStorage.setItem(key, JSON.stringify(p));
    }, PROGRESS_KEY);
    await page.goto("/certificate/");
    await expect(page.getByTestId("certificate")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await shot(page, "12-phone-certificate.png");
  });
});
