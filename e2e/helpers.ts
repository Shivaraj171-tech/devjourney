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
    await q.getByRole("button").nth(questions[i].answer).click();
    await expect(q.getByRole("button").first()).toBeDisabled();
  }
}

export async function readProgress(page: Page) {
  return page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? "null"), PROGRESS_KEY);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
