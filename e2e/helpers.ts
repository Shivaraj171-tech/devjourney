// Shared helpers for the DevJourney end-to-end tests.
// Ticket data (solutions, quiz answers) is read straight from content/ on disk,
// so the tests follow the content as it changes.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { load } from "js-yaml";
import { expect, type Page } from "@playwright/test";

export const PROGRESS_KEY = "devjourney:progress:v1";
const SEASONS_DIR = join(__dirname, "..", "content", "seasons");

export type Question = { prompt: string; choices: string[]; answer: number };
export type TicketInfo = {
  id: string;
  slug: string;
  dir: string;
  type: string;
  level: string;
  filesEditable: string[];
  questions: Question[];
};

function readYaml<T>(path: string): T {
  return load(readFileSync(path, "utf-8")) as T;
}

/** Season 1 tickets, in the order season.yaml lists them. */
export function seasonTickets(seasonSlug = "s01-first-week"): TicketInfo[] {
  const seasonDir = join(SEASONS_DIR, seasonSlug);
  const season = readYaml<{ tickets: string[] }>(join(seasonDir, "season.yaml"));
  return season.tickets.map((slug) => {
    const dir = join(seasonDir, "tickets", slug);
    const meta = readYaml<{ id: string; type: string; level: string; files_editable?: string[] }>(join(dir, "ticket.yaml"));
    const qPath = join(dir, "questions.yaml");
    const questions = existsSync(qPath) ? (readYaml<{ questions?: Question[] }>(qPath).questions ?? []) : [];
    return { id: meta.id, slug, dir, type: meta.type, level: meta.level, filesEditable: meta.files_editable ?? [], questions };
  });
}

export function solutionFile(t: TicketInfo, path: string): string {
  return readFileSync(join(t.dir, "solution", path), "utf-8");
}

/** All files under a ticket's starter/ or solution/ folder. */
export function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      if (name === "__pycache__" || name.startsWith(".")) continue;
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out[relative(dir, full).split(sep).join("/")] = readFileSync(full, "utf-8");
    }
  };
  walk(dir);
  return out;
}

export const ticketUrl = (id: string) => `/ticket/${id}/`;

/** Collect uncaught page errors so a test can assert there were none. */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  return errors;
}

/** Wait until Pyodide has loaded and the Run button is clickable. */
export async function waitForPython(page: Page) {
  await expect(page.getByTestId("run-tests")).toBeEnabled({ timeout: 60_000 });
}

type MonacoWindow = Window & {
  monaco?: { editor: { getModels(): { uri: { path: string }; setValue(v: string): void; getValue(): string }[] } };
};

/** Open a file tab in the editor and replace its contents through the Monaco model. */
export async function setEditorFile(page: Page, ticketId: string, path: string, code: string) {
  await page.getByRole("button", { name: new RegExp(`${escapeRe(path)}$`) }).click();
  const modelPath = `/${ticketId}/${path}`;
  await page.waitForFunction(
    (p) => !!(window as MonacoWindow).monaco?.editor.getModels().some((m) => m.uri.path === p),
    modelPath,
    { timeout: 30_000 },
  );
  await page.evaluate(
    ({ p, c }) => {
      const model = (window as MonacoWindow).monaco!.editor.getModels().find((m) => m.uri.path === p)!;
      model.setValue(c);
    },
    { p: modelPath, c: code },
  );
}

export async function editorValue(page: Page, ticketId: string, path: string): Promise<string | undefined> {
  return page.evaluate((p) => {
    return (window as MonacoWindow).monaco?.editor.getModels().find((m) => m.uri.path === p)?.getValue();
  }, `/${ticketId}/${path}`);
}

/** Click Run and wait for a finished result (summary or error). */
export async function runTests(page: Page) {
  await waitForPython(page);
  await page.getByTestId("run-tests").click();
  await expect(page.getByTestId("run-summary").or(page.getByTestId("run-error"))).toBeVisible({ timeout: 30_000 });
}

export async function openQuizTab(page: Page) {
  await page.getByRole("tab", { name: /Quiz/ }).click();
}

/** Click the correct choice for every question (quiz tab must be open). */
export async function answerQuiz(page: Page, questions: Question[]) {
  for (let i = 0; i < questions.length; i++) {
    const q = page.getByTestId(`question-${i}`);
    await expect(q).toBeVisible();
    // Choices are shown in a shuffled order, so click the right one by its text.
    await q.getByRole("button", { name: questions[i].choices[questions[i].answer], exact: true }).click();
    await expect(q.getByRole("button").first()).toBeDisabled();
  }
}

export async function readProgress(page: Page) {
  return page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? "null"), PROGRESS_KEY);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Mark tickets as solved (with their quizzes done) in localStorage, then reload.
 * Use it to start a test further along the story, e.g. at Season 2.
 */
export async function seedSolved(page: Page, tickets: TicketInfo[]) {
  await page.goto("/");
  await page.evaluate(
    ({ key, list }) => {
      const now = new Date().toISOString();
      const ticketsState: Record<string, unknown> = {};
      for (const t of list) {
        ticketsState[t.id] = {
          code: {}, runs: 1, hintsUsed: 0, solved: true, solvedAt: now, solveXp: 100,
          quizFirstPick: Array.from({ length: t.questions }, () => 0), quizDone: true,
          quizFirstTryCorrect: t.questions, quizXp: 0,
        };
      }
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, playerName: "You", startedAt: now, activeDays: [], onboarded: true, tickets: ticketsState }),
      );
    },
    { key: PROGRESS_KEY, list: tickets.map((t) => ({ id: t.id, questions: t.questions.length })) },
  );
  await page.reload();
}

type SeasonFlags = { chain?: boolean; final?: boolean };

function seasonDirs(): { slug: string; flags: SeasonFlags }[] {
  return readdirSync(SEASONS_DIR)
    .filter((d) => statSync(join(SEASONS_DIR, d)).isDirectory())
    .sort()
    .map((slug) => ({ slug, flags: readYaml<SeasonFlags>(join(SEASONS_DIR, slug, "season.yaml")) }));
}

/**
 * Every ticket of every ON-CHAIN season (the main story, rooms `room-<id>` on the HQ),
 * in folder order (seasons are added over time). Off-chain seasons such as the final
 * exam (season.yaml `chain: false`) are left out: see finalSeasonTickets().
 */
export function allSeasonTickets(): TicketInfo[] {
  return seasonDirs()
    .filter((s) => s.flags.chain !== false)
    .flatMap((s) => seasonTickets(s.slug));
}

export type BountyInfo = TicketInfo & { requires: string | null; bugKind: string | null; title: string };

/**
 * The Bug Bounty board's tickets: side-quest seasons (`chain: false` without `final`),
 * shown as `bounty-<id>` cards on the HQ. Not part of allSeasonTickets().
 */
export function bountyTickets(): BountyInfo[] {
  return seasonDirs()
    .filter((s) => s.flags.chain === false && s.flags.final !== true)
    .flatMap((s) => seasonTickets(s.slug))
    .map((t) => {
      const meta = readYaml<{ requires?: string; bug_kind?: string; title: string }>(join(t.dir, "ticket.yaml"));
      return { ...t, requires: meta.requires ?? null, bugKind: meta.bug_kind ?? null, title: meta.title };
    });
}

/** The final exam's tickets (season.yaml `final: true`), shown as `exam-room-<id>` on the HQ. */
export function finalSeasonTickets(): TicketInfo[] {
  const final = seasonDirs().find((s) => s.flags.final === true);
  return final ? seasonTickets(final.slug) : [];
}
