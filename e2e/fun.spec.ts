// The fun layer: #orbit-team chat, rooms that animate when they change, the
// merge payoff (XP count-up, promotion, flow combo) and the season performance review.
import { expect, test, type Page } from "@playwright/test";
import { answerQuiz, openQuizTab, PROGRESS_KEY, seasonTickets, seedSolved, ticketUrl, trackPageErrors } from "./helpers";

const season1 = seasonTickets();
const season2 = seasonTickets("s02-week-two");
const SEEN_KEY = "devjourney:office-seen:v1";

async function noHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "no horizontal page scroll").toBeLessThanOrEqual(client);
}

test("#orbit-team welcomes a new hire and points at the first ticket", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await page.getByTestId("onboarding").getByRole("button").last().click();
  const chat = page.getByTestId("team-chat");
  await expect(chat.getByRole("heading", { name: "#orbit-team" })).toBeVisible();
  const messages = chat.getByTestId("chat-message");
  await expect(messages.first()).toHaveAttribute("data-from", "maya");
  await expect(chat.locator("[data-from=byte]")).toContainText("I'm Byte");
  await expect(chat.getByRole("link", { name: /Open ticket/ })).toHaveAttribute("href", new RegExp(`/ticket/${season1[0].id}/?$`));
  // First visit: nothing animates as "new".
  await expect(page.locator("[data-fresh]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("rooms merged or unlocked since the last visit get a one-time flourish", async ({ page }) => {
  await seedSolved(page, season1.slice(0, 3));
  // Pretend the last visit was before tickets 2 and 3 were merged.
  await page.evaluate(
    ({ key, seen }) => window.localStorage.setItem(key, JSON.stringify(seen)),
    { key: SEEN_KEY, seen: { solved: [season1[0].id], open: [season1[1].id] } },
  );
  await page.reload();
  await expect(page.getByTestId(`room-${season1[1].id}`)).toHaveAttribute("data-fresh", "merged");
  await expect(page.getByTestId(`room-${season1[2].id}`)).toHaveAttribute("data-fresh", "merged");
  await expect(page.getByTestId(`room-${season1[3].id}`)).toHaveAttribute("data-fresh", "unlocked");
  await expect(page.getByTestId(`room-${season1[3].id}`)).toContainText("New");
  await expect(page.getByTestId(`room-${season1[0].id}`)).not.toHaveAttribute("data-fresh", /.+/);
  // Rooms (and links) still work underneath the flourish.
  await expect(page.getByTestId(`room-${season1[3].id}`).locator("a")).toHaveAttribute("href", new RegExp(`/ticket/${season1[3].id}/?$`));

  // Seen now: a reload shows nothing new.
  await page.reload();
  await expect(page.getByTestId(`room-${season1[0].id}`)).toHaveAttribute("data-state", "done");
  await expect(page.locator("[data-fresh]")).toHaveCount(0);

  // The chat reacts to the latest merge and names the next ticket.
  const chat = page.getByTestId("team-chat");
  await expect(chat).toContainText(/Next up: #4/);
});

test("merging shows the XP count-up, a promotion when the rank changes, and the flow combo", async ({ page }) => {
  const errors = trackPageErrors(page);
  // Six clean merges (seedSolved: first run, no hints, perfect quizzes) = 600 XP.
  await seedSolved(page, season1.slice(0, 6));
  const read = season1[6];
  expect(read.type).toBe("read");
  await page.goto(ticketUrl(read.id));
  await openQuizTab(page);
  await answerQuiz(page, read.questions);

  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Ticket closed");
  // 600 + a junior read ticket crosses Trusted Intern (700 XP).
  const promo = modal.getByTestId("promotion");
  await expect(promo).toBeVisible();
  await expect(promo).toContainText("Promoted to Trusted Intern.");
  const total = (await page.getByTestId("xp-total").textContent())!;
  await expect(modal.getByTestId("xp-countup")).toHaveText(total);
  await expect(modal.getByRole("progressbar")).toHaveAttribute("aria-label", /Progress to Junior Developer/);
  await expect(modal.getByTestId("flow-chip")).toContainText("×7");
  await modal.getByRole("button", { name: "Stay here" }).click();
  await expect(modal).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("no promotion banner when the rank doesn't change; reduced motion shows the final XP at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedSolved(page, season1.slice(0, 6));
  // Start well past 700 XP, and break the flow with a messy merge.
  await page.evaluate((key) => {
    const p = JSON.parse(window.localStorage.getItem(key)!);
    const ids = Object.keys(p.tickets);
    p.tickets[ids[0]].solveXp = 400;
    p.tickets[ids[5]] = { ...p.tickets[ids[5]], runs: 3, hintsUsed: 1, solvedAt: new Date().toISOString() };
    window.localStorage.setItem(key, JSON.stringify(p));
  }, PROGRESS_KEY);
  const read = season1[6];
  await page.goto(ticketUrl(read.id));
  await openQuizTab(page);
  await answerQuiz(page, read.questions);
  const modal = page.getByTestId("solved-modal");
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId("promotion")).toHaveCount(0);
  await expect(modal.getByTestId("flow-chip")).toHaveCount(0); // 1 clean merge after a messy one: no combo yet
  const total = (await page.getByTestId("xp-total").textContent())!;
  await expect(modal.getByTestId("xp-countup")).toHaveText(total, { timeout: 1_000 });
});

test("finishing a season unlocks Maya's performance review", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, season1);
  const chat = page.getByTestId("team-chat");
  await expect(chat.locator("[data-id=season-s01]")).toContainText("performance review");
  await expect(page.getByTestId("review-link-s02")).toHaveCount(0);

  await page.getByTestId("review-link-s01").click();
  await expect(page).toHaveURL(/\/review\/s01\/?$/);
  const review = page.getByTestId("performance-review");
  await expect(review).toHaveAttribute("data-complete", "true");
  await expect(page.getByRole("heading", { level: 1, name: "Your First Week" })).toBeVisible();
  await expect(page.getByTestId("review-merged")).toHaveText(`${season1.length}/${season1.length}`);
  await expect(page.getByTestId("review-clean")).toHaveText(String(season1.length));
  await expect(page.getByTestId("review-rating")).toContainText("Outstanding");
  await expect(page.getByTestId("review-learned").locator("li")).toHaveCount(season1.length);
  await expect(page.getByTestId("review-strengths")).toContainText("clean merges");
  await expect(page.getByRole("link", { name: /Start next floor/ })).toHaveAttribute("href", new RegExp(`/ticket/${season2[0].id}/?$`));
  expect(errors).toEqual([]);
});

test("an unfinished season shows a gentle mid-season check-in", async ({ page }) => {
  await seedSolved(page, season1);
  await page.goto("/review/s02/");
  const review = page.getByTestId("performance-review");
  await expect(review).toHaveAttribute("data-complete", "false");
  await expect(review).toContainText("Mid-season check-in");
  await expect(page.getByTestId("review-merged")).toHaveText(`0/${season2.length}`);
  await expect(page.getByRole("link", { name: "Back to the office" })).toBeVisible();
});

test("the fun layer fits a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSolved(page, season1);
  await expect(page.getByTestId("team-chat")).toBeVisible();
  await noHorizontalScroll(page);
  await page.goto("/review/s01/");
  await expect(page.getByTestId("performance-review")).toBeVisible();
  await noHorizontalScroll(page);
});
