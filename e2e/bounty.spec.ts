// The Bug Bounty board (content/seasons/s50-bug-bounty, an off-chain side quest):
// "mystery bug" tickets with no concept label or lesson, each opening once the
// ticket that taught its concept is solved, revealing the kind of bug afterwards.
// It must never block anything: the final exam stays gated on the last on-chain season.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test } from "@playwright/test";
import {
  allSeasonTickets,
  bountyTickets,
  finalSeasonTickets,
  readProgress,
  runTests,
  seedSolved,
  setEditorFile,
  solutionFile,
  ticketUrl,
  trackPageErrors,
  waitForPython,
} from "./helpers";
import { playTicket } from "./play";

const onChain = allSeasonTickets();
const bounties = bountyTickets();
const finals = finalSeasonTickets();
const byId = (id: string) => onChain.find((t) => t.id === id)!;
const upTo = (id: string) => onChain.slice(0, onChain.indexOf(byId(id)) + 1);

const SHOTS = process.env.BOUNTY_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

test("content: 8 mystery bugs, off the story, each opened by an on-chain ticket", () => {
  expect(bounties).toHaveLength(8);
  for (const b of bounties) {
    expect(onChain.some((t) => t.id === b.requires), `${b.id} requires ${b.requires}`).toBe(true);
    expect(b.bugKind).toBeTruthy();
    expect(onChain.some((t) => t.id === b.id)).toBe(false); // allSeasonTickets() stays on-chain only
  }
  expect(new Set(bounties.map((b) => b.bugKind)).size).toBe(8);
});

test("HQ: the board shows locked cards with what opens them; floors are unchanged", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, upTo("s01-t04"));
  await page.goto("/");
  const board = page.getByTestId("bug-bounty");
  await expect(board).toBeVisible();
  await expect(board.getByRole("heading", { name: "Bug Bounty" })).toBeVisible();
  await expect(board.locator("[data-testid^=bounty-s50-]")).toHaveCount(bounties.length);

  for (const b of bounties) {
    const card = page.getByTestId(`bounty-${b.id}`);
    const open = onChain.indexOf(byId(b.requires!)) <= onChain.indexOf(byId("s01-t04"));
    await expect(card).toHaveAttribute("data-state", open ? "open" : "locked");
    await expect(card).toContainText("Mystery bug, about 5 min");
    await expect(card.getByTestId("bounty-xp")).toContainText("XP");
    // No concept label anywhere on the card, and no reveal before it's solved.
    await expect(card).not.toContainText(b.bugKind!);
    await expect(card.getByTestId("bounty-reveal")).toHaveCount(0);
    if (!open) {
      // What opens it, without the required ticket's title (it would name the concept).
      await expect(card).toContainText(/Opens after ticket #\d+ of /);
      const required = load(readFileSync(join(byId(b.requires!).dir, "ticket.yaml"), "utf-8")) as { title: string };
      await expect(card).not.toContainText(required.title);
    }
  }
  const first = bounties.find((b) => b.requires === "s01-t04")!;
  await expect(page.getByTestId(`bounty-${first.id}`).locator("a")).toHaveAttribute("href", new RegExp(`/ticket/${first.id}/?$`));
  await expect(board.getByTestId("bounty-progress")).toContainText(`0 of ${bounties.length} solved, 1 open`);

  // The floors are still the story: rooms only for on-chain tickets, and no extra floor.
  await expect(page.locator("[data-testid^=room-]")).toHaveCount(onChain.length);
  for (let floor = 1; floor <= 5; floor++) await expect(page.getByTestId(`floor-${floor}`)).toBeVisible();
  await expect(page.getByTestId("floor-6")).toHaveCount(0);
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "locked");
  await board.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "bounty-board-hq.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("a mystery bug: no concept chip or lesson; solved, it reveals the kind of bug and links to the lesson", async ({ page }) => {
  const errors = trackPageErrors(page);
  const b = bounties.find((x) => x.requires === "s01-t04")!;
  await seedSolved(page, upTo("s01-t04"));
  await page.goto(ticketUrl(b.id));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(b.title);
  await expect(page.getByTestId("bounty-banner")).toBeVisible();
  await expect(page.getByText(/^New: /)).toHaveCount(0);
  await expect(page.getByTestId("lesson")).toHaveCount(0);
  await expect(page.getByText("Mystery bug", { exact: true })).toBeVisible();
  await expect(page.getByTestId("hints-toggle").first()).toBeVisible(); // hints are allowed
  await page.screenshot({ path: join(SHOTS, "bounty-ticket.png") });

  // Play it like a learner: starter fails, the fix passes.
  await playTicket(page, b);
  await expect(page.getByTestId("bounty-banner")).toHaveCount(0);
  const reveal = page.getByTestId("bounty-reveal");
  await expect(reveal).toContainText(`This was an ${b.bugKind} bug.`);
  await expect(reveal.getByTestId("bounty-lesson-link")).toHaveAttribute("href", /\/ticket\/s01-t04\/#lesson$/);
  // Off the story: no "Next ticket" after a bounty.
  await expect(page.getByRole("link", { name: /^Next ticket:/ })).toHaveCount(0);

  // The lesson link opens the original ticket with its lesson unfolded.
  await reveal.getByTestId("bounty-lesson-link").click();
  await expect(page).toHaveURL(/\/ticket\/s01-t04\/#lesson$/);
  await expect(page.getByTestId("lesson-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("lesson")).toBeInViewport();

  // Back on the HQ: the card is done and shows the reveal and the bounty earned.
  await page.goto("/");
  const card = page.getByTestId(`bounty-${b.id}`);
  await expect(card).toHaveAttribute("data-state", "done");
  await expect(card.getByTestId("bounty-reveal")).toContainText(`This was an ${b.bugKind} bug.`);
  const p = await readProgress(page);
  await expect(card.getByTestId("bounty-xp")).toHaveText(`+${p.tickets[b.id].solveXp} XP`);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "bounty-solved-hq.png") });
  expect(errors).toEqual([]);
});

test("the solved modal reveals the bug and goes back to the office", async ({ page }) => {
  const b = bounties.find((x) => x.requires === "s01-t04")!;
  await seedSolved(page, upTo("s01-t04"));
  await page.goto(ticketUrl(b.id));
  // Like playCode: wait for Python and the editor first, so the fix is what gets run.
  await waitForPython(page);
  for (const path of b.filesEditable) await setEditorFile(page, b.id, path, solutionFile(b, path));
  await expect.poll(() => readProgress(page).then((p) => p.tickets[b.id]?.code?.[b.filesEditable[0]])).toBe(solutionFile(b, b.filesEditable[0]));
  await runTests(page);
  await expect(page.getByTestId("run-summary")).toContainText("All checks passed");
  const modal = page.getByTestId("solved-modal");
  await expect(modal).toContainText(`This was an ${b.bugKind} bug.`);
  await expect(modal.getByRole("link", { name: "Back to the office" })).toBeVisible();
  await page.screenshot({ path: join(SHOTS, "bounty-solved-modal.png") });
});

test("a locked bounty says what opens it", async ({ page }) => {
  const b = bounties.find((x) => x.requires && x.requires.startsWith("s05"))!;
  await seedSolved(page, upTo("s01-t04"));
  await page.goto(ticketUrl(b.id));
  await expect(page.getByRole("heading", { name: /still in the backlog/ })).toBeVisible();
  await expect(page.getByTestId("locked-reason")).toContainText(/This bounty opens once you've solved ticket #\d+/);
  await expect(page.getByRole("link", { name: "Go to previous ticket" })).toHaveAttribute("href", new RegExp(`/ticket/${b.requires}/?$`));
  await expect(page.getByTestId("run-tests")).toHaveCount(0);
});

test("the bounty board never blocks the story: the final exam opens with no bounty solved", async ({ page }) => {
  const errors = trackPageErrors(page);
  await seedSolved(page, onChain);
  await page.goto("/");
  await expect(page.getByTestId("final-exam")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId(`exam-room-${finals[0].id}`)).toHaveAttribute("data-state", "open");
  // Every bounty is open, none solved.
  for (const b of bounties) await expect(page.getByTestId(`bounty-${b.id}`)).toHaveAttribute("data-state", "open");
  // "Next ticket" on the last story ticket goes to the exam, not to the bounty board.
  await page.goto(ticketUrl(onChain.at(-1)!.id));
  await expect(page.getByRole("link", { name: /^Next ticket:/ })).toHaveAttribute("href", new RegExp(`/ticket/${finals[0].id}/?$`));
  await page.goto(ticketUrl(finals[0].id));
  await expect(page.getByText(/still in the backlog/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("every bounty can be solved: starter fails, the fix passes", async ({ page }) => {
  test.setTimeout(600_000);
  const errors = trackPageErrors(page);
  await seedSolved(page, onChain);
  for (const b of bounties) await playTicket(page, b);
  const p = await readProgress(page);
  for (const b of bounties) expect(p.tickets[b.id].solved, b.id).toBe(true);
  await page.goto("/");
  await expect(page.getByTestId("bounty-progress")).toContainText(`${bounties.length}/${bounties.length} solved`);
  for (const b of bounties) {
    await expect(page.getByTestId(`bounty-${b.id}`).getByTestId("bounty-reveal")).toContainText(b.bugKind!);
  }
  await page.getByTestId("bug-bounty").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "bounty-board-complete.png"), fullPage: true });
  expect(errors).toEqual([]);
});
