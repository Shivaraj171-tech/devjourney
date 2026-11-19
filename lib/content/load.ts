// Reads content/ from disk. Server-only: runs at build time (static export).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { load as parseYaml } from "js-yaml";
import type { Question, Season, Ticket } from "./types";

const CONTENT_DIR = join(process.cwd(), "content", "seasons");

function readText(path: string): string {
  return readFileSync(path, "utf-8");
}

function readYaml<T>(path: string): T {
  return parseYaml(readText(path)) as T;
}

/** All files under dir as { "app/greeting.py": "..." } (skips __pycache__). */
function readTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(dir)) return out;
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      if (name === "__pycache__" || name.startsWith(".")) continue;
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out[relative(dir, full).split(sep).join("/")] = readText(full);
    }
  };
  walk(dir);
  return out;
}

/** Split hints.md on lines that are exactly "---". */
export function splitHints(text: string): string[] {
  const hints: string[] = [];
  let current: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "---") {
      hints.push(current.join("\n").trim());
      current = [];
    } else current.push(line);
  }
  hints.push(current.join("\n").trim());
  return hints.filter(Boolean);
}

type TicketYaml = {
  id: string;
  title: string;
  type: Ticket["type"];
  level: Ticket["level"];
  track: string;
  concepts: string[];
  new_concept: string;
  estimated_minutes: number;
  tests_visible: boolean;
  files_editable: string[];
};

function loadTicket(seasonId: string, dir: string, slug: string, number: number): Ticket {
  const meta = readYaml<TicketYaml>(join(dir, "ticket.yaml"));
  const questionsPath = join(dir, "questions.yaml");
  const questions = existsSync(questionsPath)
    ? (readYaml<{ questions?: Question[] }>(questionsPath).questions ?? [])
    : [];
  return {
    id: meta.id,
    slug,
    seasonId,
    number,
    title: meta.title,
    type: meta.type,
    level: meta.level,
    track: meta.track,
    concepts: meta.concepts ?? [],
    newConcept: meta.new_concept,
    estimatedMinutes: meta.estimated_minutes,
    testsVisible: meta.tests_visible,
    filesEditable: meta.files_editable ?? [],
    story: readText(join(dir, "story.md")),
    hints: splitHints(readText(join(dir, "hints.md"))),
    questions,
    starter: readTree(join(dir, "starter")),
    tests: readTree(join(dir, "tests")),
  };
}

let cache: Season[] | null = null;

export function loadSeasons(): Season[] {
  if (cache) return cache;
  const seasons: Season[] = [];
  for (const slug of readdirSync(CONTENT_DIR).sort()) {
    const dir = join(CONTENT_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    const meta = readYaml<{ id: string; title: string; intro: string; tickets: string[] }>(
      join(dir, "season.yaml"),
    );
    const tickets = (meta.tickets ?? []).map((t, i) =>
      loadTicket(meta.id, join(dir, "tickets", t), t, i + 1),
    );
    seasons.push({ id: meta.id, slug, title: meta.title, intro: meta.intro, tickets });
  }
  cache = seasons;
  return seasons;
}

export function allTickets(): Ticket[] {
  return loadSeasons().flatMap((s) => s.tickets);
}

export function getTicket(id: string): Ticket | undefined {
  return allTickets().find((t) => t.id === id);
}
