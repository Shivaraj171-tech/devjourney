// The learner model: "My coding profile". Built only from what is already saved in
// the browser (lib/progress/store.ts): test runs and their run logs, hints, quiz first
// picks, warm-ups, practice formats and Byte decisions. No AI, no server.
//
// Two parts, both explained with their evidence:
//
//  1. MASTERY per concept, 0-1. Every piece of evidence is an observation with a
//     score (0 = struggled, 1 = nailed it) and a weight. The estimate is the weighted
//     average, pulled towards 0.5 by a prior worth PRIOR_WEIGHT, and each weight
//     halves every HALF_LIFE_DAYS (recent work counts most):
//         mastery = (0.5 * PRIOR + sum(w * decay * score)) / (PRIOR + sum(w * decay))
//     Evidence: runs needed to pass a ticket (first run = strong positive), hints,
//     quiz first picks, warm-ups, trace / predict / Parsons / break-it results, Byte
//     outcomes on that ticket, and error kinds tied to concepts (KeyError ->
//     dictionaries, AttributeError on None -> None, SyntaxError / IndentationError /
//     NameError -> syntax basics, IndexError -> lists, timeouts and failing
//     boundary checks ("off-by-one style") -> loops, ...).
//     Focus areas: enough evidence (confidence) and mastery under FOCUS_BELOW.
//     Strengths: enough evidence and mastery of STRONG_FROM or more.
//
//  2. HABITS, each with plain-English evidence: trusts Byte quickly / checks Byte's
//     work, tests edge cases / edge cases to watch, re-runs without changes / runs
//     often, uses the debugger, leans on hints / works without hints, reads errors.
//
// Nothing here is a penalty: the profile changes no XP and is only shown to the learner.
// Pure functions (imports with .ts so node can unit-test them).
import { suggestionOutcome, type SuggestionRecord } from "./byte.ts";
import { cleanRunLog, entryPassed, errorKindLabel, isBoundaryCheck, type RunLogEntry } from "./runLog.ts";
import { daysBetween, isoToDay, type WarmupAttempt } from "./warmups.ts";
import type { FormatRecord } from "./formats.ts";
import { conceptLabel } from "../content/concepts.ts";

export const PRIOR_WEIGHT = 1;
export const HALF_LIFE_DAYS = 21;
/** Below this mastery (with enough evidence) a concept is a focus area. */
export const FOCUS_BELOW = 0.55;
/** From this mastery (with enough evidence) a concept is a strength. */
export const STRONG_FROM = 0.75;
/** Evidence weight needed before we say anything about a concept. */
export const MIN_CONFIDENCE = 1.5;
export const MAX_FOCUS = 3;
export const MAX_STRENGTHS = 4;

// ---------- content the model needs (built at build time, no code or answers) ----------

export type ProfileTicketMeta = {
  id: string;
  number: number;
  title: string;
  seasonTitle: string;
  /** The concept the ticket teaches (conceptKey form). "" for the final exam. */
  concept: string;
  /** Every concept the ticket uses (conceptKey form). */
  concepts: string[];
  type: string;
  bounty: boolean;
  final: boolean;
  hasLesson: boolean;
  /** Practice items on the ticket (formats.yaml), e.g. ["trace:0", "predict:0"]. */
  formats: string[];
  /** Checks that test a boundary or edge case (runLog.ts isBoundaryCheck). */
  boundaryChecks: string[];
  /** Bug Bounty only: the ticket that opens it. */
  requires: string | null;
};
export type ProfileWarmupMeta = { id: string; title: string; concept: string; after: string };
export type ProfileContent = { tickets: ProfileTicketMeta[]; warmups: ProfileWarmupMeta[] };

/** The parts of a ticket's saved progress the model reads (lib/progress/store.ts TicketProgress). */
export type ProfileTicketProgress = {
  runs: number;
  hintsUsed: number;
  solved: boolean;
  solvedAt?: string;
  quizFirstPick: (number | null)[];
  quizDone: boolean;
  quizFirstTryCorrect: number;
  reviewFalseAlarms?: string[];
  byteSuggestion?: SuggestionRecord;
  formats?: Record<string, FormatRecord>;
  runLog?: RunLogEntry[];
};

/** One slug per concept: "None (no value)", "None" and "none" are all "none". */
export function conceptKey(concept: string): string {
  const c = (concept ?? "").trim();
  if (/^none\b/i.test(c)) return "none";
  return c.toLowerCase();
}

const EXTRA_LABELS: Record<string, string> = { none: "None (no value)", syntax: "Syntax basics" };
export function profileConceptLabel(key: string): string {
  return EXTRA_LABELS[key] ?? conceptLabel(key);
}

/** The label inside a sentence: "dictionaries", but "None (no value)" and "JSON" keep their capitals. */
export function inlineConceptLabel(key: string): string {
  const label = profileConceptLabel(key);
  return /^(None|JSON)\b/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

// ---------- evidence ----------

export type EvidenceSource = "runs" | "hints" | "quiz" | "review" | "warmup" | "format" | "byte" | "error";

export type Evidence = {
  concept: string;
  source: EvidenceSource;
  /** 0 = struggled, 1 = nailed it. */
  score: number;
  weight: number;
  /** Local YYYY-MM-DD. */
  day: string;
  /** Evidence with the same group is shown as one line. */
  group: string;
  /** Plain English for this group, given how many items it has. */
  text: (count: number) => string;
  ticketId?: string;
};

/** A line of evidence as shown to the learner. */
export type EvidenceLine = { text: string; positive: boolean; impact: number; source: EvidenceSource; ticketId?: string };

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

function ticketName(meta: ProfileTicketMeta | undefined, id: string): string {
  if (!meta) return id;
  return meta.bounty ? `bounty #${meta.number} “${meta.title}”` : `#${meta.number} “${meta.title}”`;
}

/** Error kind -> the concept it points to (null: just the ticket's own concept). */
export function errorConcept(kind: string, ticket: ProfileTicketMeta | undefined): string | null {
  switch (kind) {
    case "KeyError":
      return "dictionaries";
    case "NoneAttributeError":
    case "NoneTypeError":
      return "none";
    case "SyntaxError":
    case "IndentationError":
    case "NameError":
      return "syntax";
    case "IndexError":
      return "lists";
    case "ZeroDivisionError":
      return "numbers";
    case "RecursionError":
      return "functions";
    case "Timeout":
      return ticket?.concepts.includes("while-loops") ? "while-loops" : "loops";
    default:
      return null;
  }
}

/** A failing boundary check ("off-by-one style") -> loops if the ticket loops, else conditionals, else its concept. */
export function boundaryConcept(ticket: ProfileTicketMeta | undefined): string | null {
  if (!ticket) return "loops";
  for (const c of ["loops", "while-loops", "conditionals"]) if (ticket.concepts.includes(c)) return c;
  return ticket.concept || null;
}

function isBoundary(name: string, ticket: ProfileTicketMeta | undefined): boolean {
  return ticket?.boundaryChecks.includes(name) || isBoundaryCheck(name);
}

const dayOfMs = (ms: number) => isoToDay(new Date(ms).toISOString());

/** The ticket's last known activity day (for evidence without its own timestamp). */
function ticketDay(t: ProfileTicketProgress, today: string): string {
  const log = t.runLog?.at(-1);
  if (log) return dayOfMs(log.at);
  if (t.solvedAt) return isoToDay(t.solvedAt);
  return today;
}

/** How many runs it took to pass (from the run log when it has the passing run, else the run count). */
export function runsToPass(t: ProfileTicketProgress): number | null {
  if (!t.solved) return null;
  const log = cleanRunLog(t.runLog);
  const i = log.findIndex(entryPassed);
  // Solved before the log existed (older saves): fall back to the run count.
  const solvedBeforeLog = !!t.solvedAt && log.length > 0 && Date.parse(t.solvedAt) < log[0].at - 1000;
  // Runs older than the capped log are added back from the run counter.
  if (i !== -1 && !solvedBeforeLog) return i + 1 + Math.max(0, t.runs - log.length);
  return t.runs > 0 ? t.runs : null;
}

function runsScore(runs: number): number {
  if (runs <= 1) return 1;
  if (runs === 2) return 0.85;
  if (runs === 3) return 0.7;
  if (runs <= 5) return 0.5;
  if (runs <= 8) return 0.35;
  return 0.25;
}

function formatEvidence(key: string, rec: FormatRecord): { score: number; positive: string; negative: string } | null {
  const [kind] = key.split(":");
  const names: Record<string, string> = { predict: "output prediction", break_it: "break-Byte's-code task", parsons: "Parsons puzzle", trace: "trace table" };
  const name = names[kind] ?? "practice task";
  if (kind === "predict") {
    if (!rec.done) return null;
    return { score: rec.correct ? 1 : 0.2, positive: `predicted the output right`, negative: `an output prediction was off` };
  }
  if (rec.attempts === 0 && !rec.watched) return null;
  let score: number;
  if (rec.done) score = rec.watched ? 0.6 : rec.attempts <= (kind === "break_it" ? 3 : 2) ? 1 : 0.65;
  else score = rec.watched ? 0.4 : 0.35;
  return { score, positive: `solved a ${name} quickly`, negative: rec.done ? `a ${name} took a few tries` : `a ${name} is still open` };
}

/** Every piece of evidence in the learner's progress. */
export function collectEvidence(input: {
  tickets: Record<string, ProfileTicketProgress>;
  warmupLog: WarmupAttempt[];
  content: ProfileContent;
  today: string;
}): Evidence[] {
  const { tickets, warmupLog, content, today } = input;
  const metaById = new Map(content.tickets.map((t) => [t.id, t]));
  const warmupById = new Map(content.warmups.map((w) => [w.id, w]));
  const out: Evidence[] = [];

  for (const [id, raw] of Object.entries(tickets)) {
    if (!raw) continue;
    const t: ProfileTicketProgress = { ...raw, runLog: cleanRunLog(raw.runLog) };
    const meta = metaById.get(id);
    const concept = meta?.concept ?? "";
    const name = ticketName(meta, id);
    const day = ticketDay(t, today);
    const codeTicket = !meta || (meta.type !== "read" && meta.type !== "review");

    if (concept) {
      // Runs to pass (code tickets).
      if (codeTicket) {
        const runs = runsToPass(t);
        if (runs !== null) {
          const first = runs <= 1;
          out.push({
            concept,
            source: "runs",
            score: runsScore(runs),
            weight: first ? 1.5 : 1,
            day: t.solvedAt ? isoToDay(t.solvedAt) : day,
            group: `runs:${id}`,
            text: () => (first ? `passed ${name} on the first run` : `took ${runs} runs to pass ${name}`),
            ticketId: id,
          });
        } else if (!t.solved && t.runs >= 3) {
          out.push({
            concept,
            source: "runs",
            score: 0.3,
            weight: 0.5,
            day,
            group: `runs:${id}`,
            text: () => `still working on ${name} (${plural(t.runs, "run")} so far)`,
            ticketId: id,
          });
        }
      }
      // Hints.
      if (t.hintsUsed > 0) {
        out.push({
          concept,
          source: "hints",
          score: 0.35,
          weight: Math.min(1.5, 0.5 * t.hintsUsed),
          day,
          group: `hints:${id}`,
          text: () => `used ${plural(t.hintsUsed, "hint")} on ${name}`,
          ticketId: id,
        });
      }
      // Quiz first picks.
      const answered = (t.quizFirstPick ?? []).filter((p) => p !== null).length;
      if (t.quizDone && answered > 0) {
        const right = Math.min(answered, t.quizFirstTryCorrect ?? 0);
        out.push({
          concept,
          source: "quiz",
          score: right / answered,
          weight: 0.5 * answered,
          day,
          group: `quiz:${id}`,
          text: () => `${right} of ${answered} quiz answers right first try on ${name}`,
          ticketId: id,
        });
      }
      // Review tickets: lines flagged that were fine.
      if (meta?.type === "review" && t.solved) {
        const falseAlarms = t.reviewFalseAlarms?.length ?? 0;
        out.push({
          concept,
          source: "review",
          score: falseAlarms === 0 ? 1 : falseAlarms === 1 ? 0.6 : 0.35,
          weight: 1,
          day,
          group: `review:${id}`,
          text: () => (falseAlarms === 0 ? `reviewed ${name} with no false alarms` : `flagged ${plural(falseAlarms, "fine line")} on ${name}`),
          ticketId: id,
        });
      }
      // Practice formats.
      for (const [key, rec] of Object.entries(t.formats ?? {})) {
        const f = rec ? formatEvidence(key, rec) : null;
        if (!f) continue;
        const positive = f.score >= 0.5;
        out.push({
          concept,
          source: "format",
          score: f.score,
          weight: 0.75,
          day,
          group: `format:${id}:${positive ? "+" : "-"}`,
          text: (n) => (n > 1 ? `${plural(n, "practice task")} on ${name} ${positive ? "went well" : "took a few tries"}` : `${positive ? f.positive : f.negative} on ${name}`),
          ticketId: id,
        });
      }
      // Byte's suggestion on this ticket (practice rounds don't count).
      if (t.byteSuggestion && !t.byteSuggestion.tutorial) {
        const outcome = suggestionOutcome(t.byteSuggestion, t);
        const scores: Record<string, number> = { caught: 1, trusted: 1, "waved-through": 0.1, doubted: 0.4 };
        const texts: Record<string, string> = {
          caught: `caught Byte's wrong suggestion on ${name}`,
          trusted: `checked Byte's good suggestion on ${name}`,
          "waved-through": `Byte's wrong suggestion went in as-is on ${name}`,
          doubted: `turned down Byte's good suggestion on ${name}`,
        };
        if (outcome in scores) {
          out.push({ concept, source: "byte", score: scores[outcome], weight: 1, day, group: `byte:${id}`, text: () => texts[outcome], ticketId: id });
        }
      }
    }

    // What the code did: error kinds tied to concepts (only runs where the code changed:
    // re-running the same code is the same evidence).
    const counted = new Map<string, number>();
    for (const e of t.runLog ?? []) {
      if (!e.changed || entryPassed(e)) continue;
      const tags = new Map<string, string>(); // concept -> error kind
      for (const kind of e.errors) {
        if (kind === "AssertionFail") continue;
        const c = errorConcept(kind, meta);
        if (c && !tags.has(c)) tags.set(c, kind);
      }
      if (e.errors.includes("AssertionFail") && e.failing.some((n) => isBoundary(n, meta))) {
        const c = boundaryConcept(meta);
        if (c && !tags.has(c)) tags.set(c, "Boundary");
      }
      for (const [c, kind] of tags) {
        const key = `${c}|${kind}`;
        const n = (counted.get(key) ?? 0) + 1;
        counted.set(key, n);
        if (n > 4) continue; // a long struggle on one ticket counts at most 4 times
        out.push({
          concept: c,
          source: "error",
          score: 0,
          weight: 0.5,
          day: dayOfMs(e.at),
          group: `error:${id}:${kind}`,
          text: (count) => (kind === "Boundary" ? `an edge-case check failed on ${plural(count, "run")} of ${name}` : `${count} ${errorKindLabel(kind, count)} on ${name}`),
          ticketId: id,
        });
      }
    }
  }

  // Warm-ups (first pick of each).
  for (const a of warmupLog) {
    const w = warmupById.get(a.id);
    if (!w) continue;
    const concept = conceptKey(w.concept);
    const label = inlineConceptLabel(concept);
    out.push({
      concept,
      source: "warmup",
      score: a.correct ? 1 : 0,
      weight: 1,
      day: a.day,
      group: `warmup:${concept}:${a.correct ? "+" : "-"}`,
      text: (n) => (a.correct ? `${plural(n, "warm-up")} on ${label} right first try` : `missed ${plural(n, "warm-up")} on ${label}`),
    });
  }
  return out;
}

// ---------- mastery ----------

export type ConceptMastery = {
  concept: string;
  label: string;
  /** 0-1. */
  mastery: number;
  /** Total (decayed) evidence weight. */
  confidence: number;
  /** Strongest evidence first. */
  lines: EvidenceLine[];
  /** The 1-3 lines that explain the estimate best ("because: ..."). */
  because: string[];
};

export function decay(day: string, today: string): number {
  return Math.pow(0.5, Math.max(0, daysBetween(day, today)) / HALF_LIFE_DAYS);
}

export function masteryByConcept(evidence: Evidence[], today: string): ConceptMastery[] {
  const byConcept = new Map<string, Evidence[]>();
  for (const e of evidence) {
    if (!e.concept) continue;
    byConcept.set(e.concept, [...(byConcept.get(e.concept) ?? []), e]);
  }
  const out: ConceptMastery[] = [];
  for (const [concept, items] of byConcept) {
    let num = 0.5 * PRIOR_WEIGHT;
    let den = PRIOR_WEIGHT;
    const groups = new Map<string, { items: Evidence[]; impactPos: number; impactNeg: number }>();
    for (const e of items) {
      const w = e.weight * decay(e.day, today);
      num += w * e.score;
      den += w;
      const g = groups.get(e.group) ?? { items: [], impactPos: 0, impactNeg: 0 };
      g.items.push(e);
      g.impactPos += w * e.score;
      g.impactNeg += w * (1 - e.score);
      groups.set(e.group, g);
    }
    const mastery = num / den;
    const lines: EvidenceLine[] = [...groups.values()].map((g) => {
      const positive = g.impactPos >= g.impactNeg;
      return { text: g.items[0].text(g.items.length), positive, impact: positive ? g.impactPos : g.impactNeg, source: g.items[0].source, ticketId: g.items[0].ticketId };
    });
    lines.sort((a, b) => b.impact - a.impact);
    // Explain with the side that drives the estimate.
    const lowSide = mastery < 0.5;
    const because = lines.filter((l) => l.positive !== lowSide).slice(0, 3).map((l) => l.text);
    out.push({ concept, label: profileConceptLabel(concept), mastery, confidence: den - PRIOR_WEIGHT, lines, because: because.length ? because : lines.slice(0, 2).map((l) => l.text) });
  }
  return out.sort((a, b) => a.mastery - b.mastery || b.confidence - a.confidence);
}

// ---------- habits ----------

export type HabitTone = "strength" | "tip" | "neutral";
export type HabitId =
  | "trusts-byte"
  | "checks-byte"
  | "doubts-byte"
  | "tests-edges"
  | "misses-edges"
  | "reruns-unchanged"
  | "runs-often"
  | "uses-debugger"
  | "debugger-untried"
  | "leans-on-hints"
  | "no-hints"
  | "reads-errors"
  | "skims-errors";

export type Habit = {
  id: HabitId;
  label: string;
  tone: HabitTone;
  /** Plain-English evidence. */
  because: string;
  /** What to try next (tips only). */
  tip?: string;
};

type HabitTicket = ProfileTicketProgress & { id: string };

function lastActivity(t: ProfileTicketProgress): number {
  const log = t.runLog?.at(-1)?.at ?? 0;
  const solved = t.solvedAt ? Date.parse(t.solvedAt) || 0 : 0;
  return Math.max(log, solved);
}

/** Habits from saved progress. `content` only makes the evidence nicer (ticket names) and finds edge-case checks. */
export function detectHabits(tickets: Record<string, ProfileTicketProgress>, content?: ProfileContent): Habit[] {
  const metaById = new Map((content?.tickets ?? []).map((t) => [t.id, t]));
  const list: HabitTicket[] = Object.entries(tickets)
    .filter(([, t]) => !!t)
    .map(([id, t]) => ({ ...t, id, runLog: cleanRunLog(t.runLog) }));
  const name = (id: string) => {
    const m = metaById.get(id);
    return m ? `#${m.number}` : id;
  };
  const names = (ids: string[]) => {
    const shown = ids.slice(0, 3).map(name);
    return ids.length > 3 ? `${shown.join(", ")} and ${ids.length - 3} more` : shown.join(", ");
  };
  const habits: Habit[] = [];

  // --- Byte: trusts quickly vs checks its work (the last 5 wrong suggestions decided).
  const wrongDecided = list
    // Practice rounds (the tutorial traps on tickets 1-2) don't count toward habits.
    .filter((t) => t.byteSuggestion && !t.byteSuggestion.correct && !t.byteSuggestion.tutorial)
    .map((t) => ({ id: t.id, outcome: suggestionOutcome(t.byteSuggestion!, t), at: lastActivity(t) }))
    .filter((x) => x.outcome === "caught" || x.outcome === "waved-through")
    .sort((a, b) => a.at - b.at)
    .slice(-5);
  const waved = wrongDecided.filter((x) => x.outcome === "waved-through");
  const caught = wrongDecided.filter((x) => x.outcome === "caught");
  if (waved.length >= 2 && waved.length / wrongDecided.length >= 0.5) {
    habits.push({
      id: "trusts-byte",
      label: "Trusts Byte quickly",
      tone: "tip",
      because: `Byte's wrong code went in as-is and was run on ${names(waved.map((x) => x.id))} (${waved.length} of the last ${wrongDecided.length} wrong suggestions).`,
      tip: "Before accepting, try one example in your head: what would Byte's code return?",
    });
  } else if (caught.length >= 2 && caught.length / wrongDecided.length >= 0.67) {
    habits.push({
      id: "checks-byte",
      label: "Checks Byte's work",
      tone: "strength",
      because: `Caught Byte's wrong code on ${names(caught.map((x) => x.id))} (${caught.length} of the last ${wrongDecided.length}).`,
    });
  }

  // --- Byte: turns down good suggestions by habit (the last 5 right suggestions decided).
  // Byte is right more often than not; rejecting everything is not "checking".
  const rightDecided = list
    .filter((t) => t.byteSuggestion && t.byteSuggestion.correct && !t.byteSuggestion.tutorial)
    .map((t) => ({ id: t.id, outcome: suggestionOutcome(t.byteSuggestion!, t), at: lastActivity(t) }))
    .filter((x) => x.outcome === "trusted" || x.outcome === "doubted")
    .sort((a, b) => a.at - b.at)
    .slice(-5);
  const doubted = rightDecided.filter((x) => x.outcome === "doubted");
  if (doubted.length >= 2 && doubted.length / rightDecided.length >= 0.5) {
    habits.push({
      id: "doubts-byte",
      label: "Turns down good suggestions",
      tone: "tip",
      because: `Byte's suggestion was right on ${names(doubted.map((x) => x.id))}, and it was turned down (${doubted.length} of the last ${rightDecided.length} good suggestions).`,
      tip: "Byte is right more often than not. Check it (one example, then the tests) and accept it when it holds up.",
    });
  }

  // --- Edge cases: boundary checks failing vs never failing.
  const missedEdges: string[] = [];
  const cleanEdges: string[] = [];
  for (const t of list) {
    const log = t.runLog ?? [];
    if (log.length === 0) continue;
    const meta = metaById.get(t.id);
    const failedBoundary = log.some((e) => e.failing.some((n) => isBoundary(n, meta)));
    if (failedBoundary) missedEdges.push(t.id);
    else if (meta && meta.boundaryChecks.length > 0 && t.solved) cleanEdges.push(t.id);
  }
  const quickBreaks = list.filter((t) => Object.entries(t.formats ?? {}).some(([k, r]) => k.startsWith("break_it") && r.done && r.attempts <= 2)).map((t) => t.id);
  const edgeWins = [...new Set([...cleanEdges, ...quickBreaks])];
  if (missedEdges.length >= 2 && missedEdges.length >= edgeWins.length) {
    habits.push({
      id: "misses-edges",
      label: "Edge cases to watch",
      tone: "tip",
      because: `An edge-case check (an exact limit, an empty list, the last item) failed on ${names(missedEdges)}.`,
      tip: "Before running, try the edges in your head: exactly at the limit, empty, one item, the last item.",
    });
  } else if (edgeWins.length >= 2) {
    const parts: string[] = [];
    if (cleanEdges.length) parts.push(`edge-case checks passed every run on ${names(cleanEdges)}`);
    if (quickBreaks.length) parts.push(`found a breaking input fast on ${names(quickBreaks)}`);
    habits.push({ id: "tests-edges", label: "Tests edge cases", tone: "strength", because: `${parts.join("; ")}.`.replace(/^./, (c) => c.toUpperCase()) });
  }

  // --- Re-running without a change vs running often.
  let reruns = 0;
  let failingRuns = 0;
  const rerunTickets = new Set<string>();
  for (const t of list) {
    const log = t.runLog ?? [];
    log.forEach((e, i) => {
      if (i === 0 || entryPassed(log[i - 1])) return;
      failingRuns++;
      if (!e.changed) {
        reruns++;
        rerunTickets.add(t.id);
      }
    });
  }
  if (reruns >= 3 && reruns / Math.max(1, failingRuns) >= 0.25) {
    habits.push({
      id: "reruns-unchanged",
      label: "Re-runs without changing anything",
      tone: "tip",
      because: `${plural(reruns, "run")} on ${names([...rerunTickets])} used exactly the same code as the run before.`,
      tip: "Change one thing, then run: you'll see what that one change did.",
    });
  } else {
    const solvedCode = list.filter((t) => (t.runLog?.length ?? 0) > 0 && t.solved);
    const totalRuns = solvedCode.reduce((s, t) => s + (runsToPass(t) ?? 0), 0);
    if (solvedCode.length >= 3 && totalRuns / solvedCode.length >= 5) {
      habits.push({
        id: "runs-often",
        label: "Runs often",
        tone: "neutral",
        because: `About ${Math.round(totalRuns / solvedCode.length)} runs per ticket on your last ${solvedCode.length} tickets: lots of small experiments.`,
        tip: "That's a fine way to learn. Reading the first failing check before each run makes every run count.",
      });
    }
  }

  // --- The debugger: Step through used before passing.
  const stepped = list.filter((t) => {
    const log = t.runLog ?? [];
    const pass = log.findIndex(entryPassed);
    return log.slice(0, pass === -1 ? log.length : pass + 1).some((e) => e.stepped);
  });
  const struggled = list.filter((t) => (t.runLog ?? []).filter((e) => !entryPassed(e)).length >= 3);
  if (stepped.length >= 2) {
    habits.push({ id: "uses-debugger", label: "Uses the debugger", tone: "strength", because: `Stepped through a failing check before passing on ${names(stepped.map((t) => t.id))}.` });
  } else if (stepped.length === 0 && struggled.length >= 2) {
    habits.push({
      id: "debugger-untried",
      label: "Step through: not tried yet",
      tone: "tip",
      because: `${names(struggled.map((t) => t.id))} needed 3+ runs, without Step through.`,
      tip: "Step through on a failing check shows every line as it runs, with each variable's value.",
    });
  }

  // --- Hints.
  const solved = list.filter((t) => t.solved && !metaById.get(t.id)?.final);
  const withHints = solved.filter((t) => t.hintsUsed > 0);
  const hintTotal = withHints.reduce((s, t) => s + t.hintsUsed, 0);
  if (solved.length >= 3 && withHints.length / solved.length >= 0.5) {
    habits.push({
      id: "leans-on-hints",
      label: "Leans on hints",
      tone: "tip",
      because: `Hints on ${withHints.length} of ${solved.length} solved tickets (${plural(hintTotal, "hint")} in all).`,
      tip: "Hints are there to use. Before the next one, try Step through on the failing check: it often shows the same thing.",
    });
  } else if (solved.length >= 4 && withHints.length / solved.length <= 0.2) {
    habits.push({ id: "no-hints", label: "Works it out without hints", tone: "strength", because: `${solved.length - withHints.length} of ${solved.length} solved tickets without a hint.` });
  }

  // --- Reading errors: was the line the error pointed at edited before the next run?
  let chances = 0;
  let edited = 0;
  for (const t of list) {
    for (const e of t.runLog ?? []) {
      if (e.editedErrLine === undefined || !e.changed) continue;
      chances++;
      if (e.editedErrLine) edited++;
    }
  }
  if (chances >= 2 && edited / chances >= 0.5) {
    habits.push({ id: "reads-errors", label: "Reads the error", tone: "strength", because: `After a crash, you edited the exact line the error pointed to ${edited} of ${chances} times.` });
  } else if (chances >= 3 && edited / chances < 0.34) {
    habits.push({
      id: "skims-errors",
      label: "Start at the 📍 line",
      tone: "tip",
      because: `After a crash, the line the error pointed to was edited ${edited} of ${chances} times.`,
      tip: "The 📍 under a failing check is where Python stopped. The fix is usually on that line or just above it.",
    });
  }
  return habits;
}

export function hasHabit(habits: Habit[], id: HabitId): boolean {
  return habits.some((h) => h.id === id);
}

// ---------- the whole profile ----------

export type Profile = {
  concepts: ConceptMastery[];
  /** 2-3 concepts where practice pays off most (lowest mastery with enough evidence). */
  focus: ConceptMastery[];
  strengths: ConceptMastery[];
  habits: Habit[];
  /** Nothing to say yet (a new learner). */
  empty: boolean;
};

export function buildProfile(input: {
  tickets: Record<string, ProfileTicketProgress>;
  warmupLog: WarmupAttempt[];
  content: ProfileContent;
  today: string;
}): Profile {
  const evidence = collectEvidence(input);
  const concepts = masteryByConcept(evidence, input.today);
  const focus = concepts.filter((c) => c.confidence >= MIN_CONFIDENCE && c.mastery < FOCUS_BELOW).slice(0, MAX_FOCUS);
  const strengths = concepts
    .filter((c) => c.confidence >= MIN_CONFIDENCE && c.mastery >= STRONG_FROM)
    .sort((a, b) => b.mastery - a.mastery || b.confidence - a.confidence)
    .slice(0, MAX_STRENGTHS);
  const habits = detectHabits(input.tickets, input.content);
  return { concepts, focus, strengths, habits, empty: evidence.length === 0 && habits.length === 0 };
}

/** Concept -> mastery, for concepts with enough evidence (feeds the warm-up scheduler). */
export function masteryMap(profile: Profile): Record<string, number> {
  return Object.fromEntries(profile.concepts.filter((c) => c.confidence >= MIN_CONFIDENCE).map((c) => [c.concept, c.mastery]));
}

/** "Focus this week: Dictionaries (3 KeyErrors on #6 Order again)", or null. */
export function focusLine(profile: Profile): { concept: string; text: string } | null {
  const top = profile.focus[0];
  if (!top) return null;
  // What the code did comes first ("3 KeyErrors on #6"), then the strongest reason.
  const why = top.lines.find((l) => !l.positive && l.source === "error")?.text ?? top.because[0];
  return { concept: top.concept, text: `Focus this week: ${inlineConceptLabel(top.concept)}${why ? ` (${why})` : ""}` };
}

/** How the estimate reads in words (never a grade). */
export function masteryWords(m: number): string {
  if (m >= STRONG_FROM) return "solid";
  if (m >= FOCUS_BELOW) return "getting there";
  return "worth practising";
}

// ---------- practice made for you ----------

export type PracticeKind = "warmup" | "bounty" | "format" | "lesson";
export type PracticeItem = { kind: PracticeKind; concept: string; title: string; href: string; detail: string };

/** Concepts whose lessons also help (syntax has no ticket of its own). */
const RELATED: Record<string, string[]> = { syntax: ["strings", "tracebacks"], "while-loops": ["loops"] };

const FORMAT_NAMES: Record<string, string> = { trace: "Trace table", predict: "Predict the output", parsons: "Put the lines in order", break_it: "Break Byte's code" };

/**
 * Practice for each focus area: warm-ups on it (they come first in the daily session
 * now), open Bug Bounty tickets, practice formats on tickets that use it, and lessons.
 * Only things already unlocked (`isSolved` says which tickets are solved).
 */
export function practiceFor(
  focus: string[],
  content: ProfileContent,
  isSolved: (id: string) => boolean,
  formatDone: (ticketId: string, key: string) => boolean = () => false,
): Record<string, PracticeItem[]> {
  const out: Record<string, PracticeItem[]> = {};
  for (const concept of focus) {
    const keys = [concept, ...(RELATED[concept] ?? [])];
    const items: PracticeItem[] = [];
    for (const w of content.warmups) {
      if (conceptKey(w.concept) === concept && isSolved(w.after)) {
        items.push({ kind: "warmup", concept, title: w.title, href: "/#warm-up", detail: "Your daily warm-up asks these first" });
      }
    }
    for (const t of content.tickets) {
      if (!t.bounty || t.concept !== concept || isSolved(t.id) || (t.requires && !isSolved(t.requires))) continue;
      items.push({ kind: "bounty", concept, title: t.title, href: `/ticket/${t.id}/`, detail: "From the Bug Bounty board, picked for this skill" });
    }
    for (const t of content.tickets) {
      if (t.bounty || t.final || !isSolved(t.id) || !(keys.includes(t.concept) || t.concepts.includes(concept))) continue;
      const open = t.formats.filter((k) => !formatDone(t.id, k)).sort((a, b) => (a.startsWith("trace") ? -1 : 0) - (b.startsWith("trace") ? -1 : 0));
      for (const key of open.slice(0, 2)) {
        const kind = key.split(":")[0];
        items.push({ kind: "format", concept, title: `${FORMAT_NAMES[kind] ?? "Practice"} on #${t.number} ${t.title}`, href: `/ticket/${t.id}/`, detail: "Practice, for a little bonus XP" });
      }
    }
    for (const t of content.tickets) {
      if (t.bounty || t.final || !t.hasLesson || !keys.includes(t.concept) || !isSolved(t.id)) continue;
      items.push({ kind: "lesson", concept, title: `Lesson: ${profileConceptLabel(t.concept)} (#${t.number} ${t.title})`, href: `/ticket/${t.id}/#lesson`, detail: "A 2-minute lesson. Re-reading is free." });
    }
    // A few of each kind, warm-ups and bounties first.
    const order: PracticeKind[] = ["bounty", "format", "warmup", "lesson"];
    out[concept] = order.flatMap((k) => items.filter((i) => i.kind === k).slice(0, k === "lesson" ? 1 : 2));
    if (out[concept].length === 0) delete out[concept];
  }
  return out;
}

/** Open Bug Bounty tickets that match a focus area, in focus order (for "Recommended for you"). */
export function recommendedBounties(profile: Profile, content: ProfileContent, isSolved: (id: string) => boolean): string[] {
  const ids: string[] = [];
  for (const f of profile.focus) {
    for (const t of content.tickets) {
      if (t.bounty && t.concept === f.concept && !isSolved(t.id) && (!t.requires || isSolved(t.requires)) && !ids.includes(t.id)) ids.push(t.id);
    }
  }
  return ids;
}
