// Trace tables (formats.yaml `trace`): the learner predicts each watched variable step
// by step, "Check" traces the real code in Pyodide and compares cell by cell. The
// expected values are worked out here by running the same Python (lib/runner/formats.py)
// with python3, so the tests follow the content.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { expect, test, type Page } from "@playwright/test";
import { allSeasonTickets, readProgress, seedSolved, ticketUrl, trackPageErrors } from "./helpers";

type TraceItem = { code: string; watch: string[]; rows: number; explain: string };
type TraceRow = { line: number; values: (string | null)[] };

const all = allSeasonTickets();
const byId = (id: string) => all.find((t) => t.id === id)!;
const traceOf = (id: string): TraceItem => (load(readFileSync(join(byId(id).dir, "formats.yaml"), "utf-8")) as { trace: TraceItem[] }).trace[0];

/** The real trace table, from the same Python the browser runs. */
function realRows(item: TraceItem): TraceRow[] {
  const out = execFileSync("python3", [join(__dirname, "..", "lib", "runner", "formats.py")], {
    input: JSON.stringify({ kind: "trace", code: item.code, watch: item.watch }),
  });
  return JSON.parse(out.toString()).rows;
}

const SHOTS = process.env.BOUNTY_SCREENSHOT_DIR ?? "test-results/e2e";
mkdirSync(SHOTS, { recursive: true });

async function xpTotal(page: Page) {
  return Number((await page.getByTestId("xp-total").textContent())?.replace(/\D/g, ""));
}

async function fillGrid(page: Page, card: ReturnType<Page["getByTestId"]>, rows: (string | null)[][]) {
  for (const [r, row] of rows.entries()) {
    for (const [c, value] of row.entries()) {
      await card.getByTestId(`format-trace-0-cell-${r}-${c}`).fill(value ?? "");
    }
  }
}

test("content: at least 5 tickets across seasons have a trace table, and rows match the real trace", () => {
  const withTrace = all.filter((t) => {
    try {
      return !!(load(readFileSync(join(t.dir, "formats.yaml"), "utf-8")) as { trace?: unknown[] }).trace?.length;
    } catch {
      return false;
    }
  });
  expect(withTrace.length).toBeGreaterThanOrEqual(5);
  expect(new Set(withTrace.map((t) => t.id.slice(0, 3))).size).toBeGreaterThanOrEqual(2);
  for (const t of withTrace) {
    const item = traceOf(t.id);
    expect(realRows(item), t.id).toHaveLength(item.rows);
  }
});

test("trace table: all right on the first check is +15 XP; the grid is saved", async ({ page }) => {
  const errors = trackPageErrors(page);
  const item = traceOf("s01-t04");
  const rows = realRows(item);
  await seedSolved(page, []);
  await page.goto("/dev/formats/s01-t04/");
  const card = page.getByTestId("format-trace-0");
  await expect(card).toBeVisible();
  await expect(card.getByTestId("format-trace-0-code")).toContainText("def cart_subtotal");
  // One row per step to fill, one column per watched variable.
  await expect(card.locator("tbody tr")).toHaveCount(item.rows);
  await expect(card.locator("thead th")).toHaveText(["Step", ...item.watch]);
  await expect(card.getByTestId("format-trace-0-check")).toBeDisabled();
  // No real values before a check: nothing to peek at.
  await expect(card.getByTestId("format-trace-0-watch-open")).toHaveCount(0);

  const xp = await xpTotal(page);
  // Spacing and quote style don't matter; empty = "same as above" (here: not set yet).
  await fillGrid(page, card, rows.map((r) => r.values.map((v) => (v === null ? "" : ` ${v} `))));
  await card.getByTestId("format-trace-0-check").click();
  await expect(card.getByTestId("format-trace-0-success")).toContainText("+15 XP");
  await expect(card).toHaveAttribute("data-done", "true");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 15} XP`);
  await page.screenshot({ path: join(SHOTS, "trace-all-right.png"), fullPage: true });

  const p = await readProgress(page);
  expect(p.tickets["s01-t04"].formats["trace:0"]).toMatchObject({ kind: "trace", attempts: 1, done: true, xp: 15 });

  // Reloaded: still done, the learner's grid shown read-only.
  await page.reload();
  await expect(card).toHaveAttribute("data-done", "true");
  await expect(card.getByTestId("format-trace-0-cell-0-1")).toHaveValue(` ${rows[0].values[1]} `);
  await expect(card.getByTestId("format-trace-0-cell-0-1")).toHaveAttribute("readonly", "");
  await expect(card.getByTestId("format-trace-0-check")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("trace table: the first wrong row is highlighted, 'Watch it run' shows the real values, then +10 XP", async ({ page }) => {
  const errors = trackPageErrors(page);
  const item = traceOf("s05-t03"); // string building: initials()
  const rows = realRows(item);
  await seedSolved(page, []);
  await page.goto("/dev/formats/s05-t03/");
  const card = page.getByTestId("format-trace-0");
  const xp = await xpTotal(page);

  // A classic slip: forgetting that .upper() makes a capital letter, from step 3 on.
  const wrong = rows.map((r) => r.values.map((v) => v ?? ""));
  wrong[2] = wrong[2].map((v, c) => (c === 1 ? "'a'" : v));
  await fillGrid(page, card, wrong);
  await card.getByTestId("format-trace-0-check").click();
  const feedback = card.getByTestId("format-trace-0-feedback");
  await expect(feedback).toContainText("Step 3 is the first one that doesn't match");
  await expect(card.getByTestId("format-trace-0-row-2")).toHaveAttribute("data-wrong", "true");
  await expect(card.getByTestId("format-trace-0-cell-2-1")).toHaveAttribute("data-state", "wrong");
  await expect(card.getByTestId("format-trace-0-cell-2-0")).toHaveAttribute("data-state", "right");
  await expect(card.getByTestId("format-trace-0-cell-0-1")).toHaveAttribute("data-state", "right");
  // Rows after the first wrong one aren't graded yet: re-trace from there.
  await expect(card.getByTestId("format-trace-0-cell-4-1")).not.toHaveAttribute("data-state", /.+/);
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp} XP`); // a miss costs nothing
  await page.screenshot({ path: join(SHOTS, "trace-first-wrong-row.png"), fullPage: true });

  // Watch it run: the real values, step by step, with the line that just ran highlighted.
  await card.getByTestId("format-trace-0-watch-open").click();
  const watch = card.getByTestId("format-trace-0-watch");
  await expect(watch).toContainText(`Step 1 of ${rows.length}: line ${rows[0].line} just ran`);
  await expect(card.locator(`[data-line="${rows[0].line}"]`)).toHaveAttribute("data-current", "true");
  await watch.getByTestId("format-trace-0-watch-next").click();
  await expect(watch).toContainText(`Step 2 of ${rows.length}: line ${rows[1].line} just ran`);
  await expect(card.locator(`[data-line="${rows[1].line}"]`)).toHaveAttribute("data-current", "true");
  await watch.getByTestId("format-trace-0-watch-all").click();
  for (const [r, row] of rows.entries()) {
    for (const [c, v] of row.values.entries()) await expect(watch.getByTestId(`format-trace-0-watch-cell-${r}-${c}`)).toHaveText(v ?? "—");
  }
  await page.screenshot({ path: join(SHOTS, "trace-watch-it-run.png"), fullPage: true });

  // Fix the row (strings may be typed without quotes) and check again: watched, so +10.
  await card.getByTestId("format-trace-0-cell-2-1").fill("A");
  await card.getByTestId("format-trace-0-check").click();
  await expect(card.getByTestId("format-trace-0-success")).toContainText("+10 XP");
  await expect(page.getByTestId("xp-total")).toHaveText(`${xp + 10} XP`);
  const p = await readProgress(page);
  expect(p.tickets["s05-t03"].formats["trace:0"]).toMatchObject({ attempts: 2, done: true, xp: 10, watched: true });
  expect(errors).toEqual([]);
});

test("trace table on the real ticket page shares the ticket's Python", async ({ page }) => {
  const errors = trackPageErrors(page);
  const t = byId("s05-t02");
  const item = traceOf(t.id);
  const rows = realRows(item);
  await seedSolved(page, all.slice(0, all.indexOf(t)));
  await page.goto(ticketUrl(t.id));
  const card = page.getByTestId("format-trace-0");
  await expect(card).toBeVisible();
  // Only the cells that change are typed: empty means "same as the row above".
  const sparse = rows.map((r, i) => r.values.map((v, c) => (v === null || (i > 0 && rows[i - 1].values[c] === v) ? "" : v)));
  await fillGrid(page, card, sparse);
  await card.getByTestId("format-trace-0-check").click();
  await expect(card.getByTestId("format-trace-0-success")).toContainText("+15 XP");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "trace-on-ticket.png") });
  // The ticket itself still works as before (its tests still fail on the starter code).
  await expect(page.getByTestId("run-tests")).toBeEnabled({ timeout: 60_000 });
  expect(errors).toEqual([]);
});
