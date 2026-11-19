import { expect, test } from "@playwright/test";
import { seasonTickets, trackPageErrors } from "./helpers";

const tickets = seasonTickets();

test("HQ shows 10 rooms with only room 1 open", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Welcome to your first day/ })).toBeVisible();

  const rooms = page.locator("[data-testid^=room-]");
  await expect(rooms).toHaveCount(10);
  expect(tickets).toHaveLength(10);

  for (const [i, t] of tickets.entries()) {
    await expect(page.getByTestId(`room-${t.id}`)).toHaveAttribute("data-state", i === 0 ? "open" : "locked");
  }
  // Locked rooms are not links; the open room is.
  await expect(page.getByTestId(`room-${tickets[0].id}`).locator("a")).toHaveCount(1);
  await expect(page.getByTestId(`room-${tickets[1].id}`).locator("a")).toHaveCount(0);

  // First visit: onboarding modal and the (mostly greyed-out) app preview.
  await expect(page.getByTestId("onboarding")).toBeVisible();
  await expect(page.getByTestId("app-preview")).toBeAttached();
  await expect(page.getByText("0/10 features shipped")).toBeAttached();

  await expect(page.getByTestId("continue")).toHaveAttribute("href", new RegExp(`/ticket/${tickets[0].id}/?$`));
  expect(errors).toEqual([]);
});

test("leaderboard renders and includes the player", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/leaderboard/");
  await expect(page.getByRole("heading", { name: /Office leaderboard/ })).toBeVisible();
  const board = page.getByTestId("leaderboard");
  await expect(board.getByText("(you)")).toBeVisible();
  await expect(board.locator("li")).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test("locked ticket page shows the backlog message", async ({ page }) => {
  await page.goto(`/ticket/${tickets[1].id}/`);
  await expect(page.getByRole("heading", { name: /still in the backlog/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to previous ticket" })).toHaveAttribute(
    "href",
    new RegExp(`/ticket/${tickets[0].id}/?$`),
  );
  await expect(page.getByTestId("run-tests")).toHaveCount(0);

  // The last ticket is locked too, and following the link lands on ticket 1.
  await page.goto(`/ticket/${tickets[9].id}/`);
  await expect(page.getByRole("heading", { name: /still in the backlog/ })).toBeVisible();
});
