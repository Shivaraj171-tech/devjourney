// Reads content/ from disk. Server-only: runs at build time (static export).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { load as parseYaml } from "js-yaml";
import { shuffleParsons } from "../game/formats";
import { shuffledOrder } from "../game/shuffle";
import type {
  ByteContent,
  BytePromptVerdict,
  ByteSuggestion,
  Question,
  Review,
  Season,
  SkillsCheck,
  SkillsCheckItem,
  TaskFormatsContent,
  Ticket,
  Warmup,
} from "./types";
import { conceptLabel } from "./concepts";
import { finalSeasonIndex, isSideQuest, mainSeasons, seasonGate } from "./order";

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
  /** incident tickets only (default 15) */
  time_limit_minutes?: number;
  /** side-quest (Bug Bounty) tickets only: the ticket that opens this one */
  requires?: string;
  /** side-quest (Bug Bounty) tickets only: revealed once solved */
  bug_kind?: string;
};

function loadTicket(seasonId: string, dir: string, slug: string, number: number, final = false): Ticket {
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
    concept: existsSync(join(dir, "concept.md")) ? readText(join(dir, "concept.md")) : null,
    // Final-exam tickets have no hints.md (the validator forbids it).
    hints: existsSync(join(dir, "hints.md")) ? splitHints(readText(join(dir, "hints.md"))) : [],
    questions,
    starter: readTree(join(dir, "starter")),
    tests: readTree(join(dir, "tests")),
    ...(meta.type === "review" ? { review: loadReview(dir) } : {}),
    ...(meta.type === "incident"
      ? { incident: { logs: readText(join(dir, "logs.txt")), timeLimitMinutes: meta.time_limit_minutes ?? 15 } }
      : {}),
    ...(existsSync(join(dir, "byte.yaml")) ? { byte: loadByte(dir) } : {}),
    ...(existsSync(join(dir, "formats.yaml")) ? { formats: loadFormats(dir, meta.id) } : {}),
    ...(final ? { final: true as const } : {}),
  };
}

type FormatsYaml = {
  predict?: { code: string; question: string; answer: string; choices?: string[]; explain: string }[];
  break_it?: {
    says: string;
    code: string;
    spec: string;
    call: string;
    input_hint: string;
    helpers?: string;
    check: string;
    crash_counts?: boolean;
    normal_input: string;
    example_input: string;
    miss?: string;
    explain: string;
  }[];
  trace?: { code: string; watch: string[]; rows: number; explain: string }[];
  parsons?: {
    goal: string;
    lines: string[];
    distractors: { line: string; replaces: number; explain: string }[];
    check?: string;
    expected_output?: string;
    explain?: string;
  }[];
};

const trimEnd = (s: string) => s.replace(/\n+$/, "");

/**
 * formats.yaml (format in scripts/validate_content.py). What would give the answer
 * away stays on the server: break_it's example_input, and which line a Parsons
 * distractor replaces (the lines are shipped already shuffled).
 */
function loadFormats(dir: string, ticketId: string): TaskFormatsContent {
  const meta = readYaml<FormatsYaml>(join(dir, "formats.yaml")) ?? {};
  return {
    predict: (meta.predict ?? []).map((p) => ({
      code: trimEnd(p.code),
      question: p.question,
      answer: trimEnd(p.answer),
      ...(p.choices ? { choices: p.choices.map(trimEnd) } : {}),
      explain: p.explain,
    })),
    breakIt: (meta.break_it ?? []).map((b) => ({
      says: b.says,
      code: trimEnd(b.code),
      spec: b.spec,
      call: b.call,
      inputHint: b.input_hint,
      helpers: b.helpers ?? "",
      check: b.check,
      crashCounts: b.crash_counts ?? false,
      normalInput: b.normal_input,
      miss: b.miss ?? "",
      explain: b.explain,
    })),
    // Only the code and the shape: the real values are worked out by tracing it in the browser.
    trace: (meta.trace ?? []).map((t) => ({ code: trimEnd(t.code), watch: t.watch, rows: t.rows, explain: t.explain })),
    parsons: (meta.parsons ?? []).map((p, i) => ({
      goal: p.goal,
      blocks: shuffleParsons(
        p.lines,
        p.distractors.map((d) => ({ line: d.line, explain: d.explain })),
        shuffledOrder(p.lines.length + p.distractors.length, `${ticketId}:parsons:${i}`),
      ),
      check: p.check ?? "",
      ...(p.expected_output !== undefined ? { expectedOutput: p.expected_output } : {}),
      explain: p.explain ?? "",
    })),
  };
}

type ByteYaml = {
  suggestion?: ByteSuggestion;
  prompt?: {
    goal: string;
    options: { prompt: string; response_code: string; verdict: BytePromptVerdict; feedback: string }[];
    best: number;
  };
};

/** byte.yaml: Byte's suggestion and/or prompt card (format in scripts/validate_content.py). */
function loadByte(dir: string): ByteContent {
  const meta = readYaml<ByteYaml>(join(dir, "byte.yaml"));
  const out: ByteContent = {};
  if (meta.suggestion) {
    const s = meta.suggestion;
    out.suggestion = {
      file: s.file,
      find: s.find,
      replace: s.replace,
      correct: s.correct,
      says: s.says,
      explain: s.explain,
      ...(s.why ? { why: { choices: s.why.choices, answer: s.why.answer } } : {}),
    };
  }
  if (meta.prompt) {
    out.prompt = {
      goal: meta.prompt.goal,
      best: meta.prompt.best,
      options: meta.prompt.options.map((o) => ({
        prompt: o.prompt,
        responseCode: o.response_code.replace(/\n+$/, ""),
        verdict: o.verdict,
        feedback: o.feedback,
      })),
    };
  }
  return out;
}

type ReviewYaml = {
  title: string;
  author: string;
  description: string;
  files: string[];
  issues: { file: string; line: number; also_lines?: number[]; explain: string }[];
  merged?: boolean;
};

/** review.yaml describes the PR; the changed files themselves live in pr/. */
function loadReview(dir: string): Review {
  const meta = readYaml<ReviewYaml>(join(dir, "review.yaml"));
  const pr = readTree(join(dir, "pr"));
  return {
    title: meta.title,
    author: meta.author,
    description: meta.description,
    files: meta.files.map((path) => ({ path, text: pr[path] ?? "" })),
    issues: meta.issues.map((i) => ({ file: i.file, line: i.line, alsoLines: i.also_lines ?? [], explain: i.explain })),
    merged: meta.merged ?? false,
  };
}

let cache: Season[] | null = null;

export function loadSeasons(): Season[] {
  if (cache) return cache;
  const seasons: Season[] = [];
  for (const slug of readdirSync(CONTENT_DIR).sort()) {
    const dir = join(CONTENT_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    const meta = readYaml<{ id: string; title: string; intro: string; tickets: string[]; chain?: boolean; final?: boolean }>(
      join(dir, "season.yaml"),
    );
    const final = meta.final === true;
    const tickets = (meta.tickets ?? []).map((t, i) =>
      loadTicket(meta.id, join(dir, "tickets", t), t, i + 1, final),
    );
    seasons.push({ id: meta.id, slug, title: meta.title, intro: meta.intro, chain: meta.chain !== false, final, tickets });
  }
  addBountyInfo(seasons);
  cache = seasons;
  return seasons;
}

/** Side-quest seasons (the Bug Bounty board): each ticket learns what it reveals and what opens it. */
function addBountyInfo(seasons: Season[]) {
  const byId = new Map(seasons.flatMap((s) => s.tickets.map((t) => [t.id, t] as const)));
  for (const season of seasons.filter(isSideQuest)) {
    for (const t of season.tickets) {
      const meta = readYaml<TicketYaml>(join(CONTENT_DIR, season.slug, "tickets", t.slug, "ticket.yaml"));
      const required = meta.requires ? byId.get(meta.requires) : undefined;
      t.bounty = {
        bugKind: meta.bug_kind ?? conceptLabel(t.newConcept),
        requires: required ? { id: required.id, title: required.title } : null,
      };
    }
  }
}

/** The side quests (e.g. the Bug Bounty board): off-chain seasons that aren't the final exam. */
export function sideQuestSeasons(): Season[] {
  return loadSeasons().filter(isSideQuest);
}

/** The story: on-chain seasons and the final exam, side quests left out. */
export function storySeasons(): Season[] {
  return mainSeasons(loadSeasons());
}

/**
 * The final exam (the season with `final: true`), and the tickets that must all be
 * solved before it opens (the nearest on-chain season before it). null if there is none.
 */
export function finalExam(): { season: Season; gate: string[] } | null {
  const seasons = loadSeasons();
  const index = finalSeasonIndex(seasons);
  return index === -1 ? null : { season: seasons[index], gate: seasonGate(seasons, index) };
}

type SkillsCheckYaml = {
  title: string;
  intro: string;
  items: { id: string; kind: SkillsCheckItem["kind"]; prompt: string; code?: string; choices: string[]; answer: number; explain: string }[];
};

/**
 * content/assessment/skills-check.yaml (format in scripts/validate_content.py).
 * Only what the browser needs: the validator's reference code, fix and asserts stay here.
 */
export function loadSkillsCheck(): SkillsCheck | null {
  const path = join(process.cwd(), "content", "assessment", "skills-check.yaml");
  if (!existsSync(path)) return null;
  const meta = readYaml<SkillsCheckYaml>(path);
  return {
    title: meta.title,
    intro: meta.intro,
    items: meta.items.map((i) => ({
      id: i.id,
      kind: i.kind,
      prompt: i.prompt,
      ...(i.code ? { code: trimEnd(i.code) } : {}),
      choices: i.choices.map(trimEnd),
      answer: i.answer,
      explain: i.explain,
    })),
  };
}

/** All daily warm-ups (content/warmups/*.yaml), sorted by id. */
export function loadWarmups(): Warmup[] {
  const dir = join(process.cwd(), "content", "warmups");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => readYaml<Warmup>(join(dir, f)));
}

export function allTickets(): Ticket[] {
  return loadSeasons().flatMap((s) => s.tickets);
}

export function getTicket(id: string): Ticket | undefined {
  return allTickets().find((t) => t.id === id);
}
