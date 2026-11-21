// Shapes of season/ticket content as the web app sees it.
// Mirrors the files in content/ (see docs/PROJECT_BRIEF.md section 4).

export type TicketType = "bug" | "feature" | "incident" | "review" | "read";
export type Level = "intern" | "junior" | "mid" | "senior";

export type Question = {
  prompt: string;
  choices: string[];
  answer: number; // 0-based index into choices
  explain: string;
};

/** One real problem in a review ticket's pull request (from review.yaml). */
export type ReviewIssue = {
  /** Path of a PR file, e.g. "app/tips.py". */
  file: string;
  /** 1-based line number the learner should flag. */
  line: number;
  /** Other lines that also count as finding this issue (e.g. a line right next to it). */
  alsoLines: number[];
  explain: string;
};

/** The pull request a `review` ticket asks the learner to review (review.yaml + pr/). */
export type Review = {
  title: string;
  author: string;
  description: string;
  /** Changed files as full file text after the change, in the order review.yaml lists them. */
  files: { path: string; text: string }[];
  issues: ReviewIssue[];
  /** True if the PR is merged as-is after the review, so the next ticket's code includes it. */
  merged: boolean;
};

/** Extra content for an `incident` ticket. */
export type Incident = {
  /** Production logs / stack trace (logs.txt). */
  logs: string;
  /** Fix it within this many minutes for the speed bonus. Never blocks the ticket. */
  timeLimitMinutes: number;
};

/** Byte (the office AI) proposes a change to one editable file (byte.yaml `suggestion`). */
export type ByteSuggestion = {
  /** One of the ticket's files_editable. */
  file: string;
  /** Exact text in the starter file (appears exactly once there). */
  find: string;
  /** Byte's proposed code for that text. */
  replace: string;
  /** True if starter + replacement passes the ticket's tests (verified by the validator). */
  correct: boolean;
  /**
   * Correct as far as it goes: it fixes part of the problem and the learner
   * finishes the rest (some checks still fail after accepting, on purpose).
   */
  partial?: true;
  /** Byte's one-line pitch. */
  says: string;
  /** Why it's right or wrong; shown once the learner has decided (and checked). */
  explain: string;
  /**
   * "Decide before evidence": when set, the learner must pick Accept/Reject AND the
   * reason (one of `choices`) before Byte's code is applied or any verdict is shown.
   */
  why?: ByteWhy;
};

/** byte.yaml `suggestion.why`: three reasons, one right. */
export type ByteWhy = {
  choices: string[];
  /** 0-based index of the right reason. */
  answer: number;
};

// ---------- Extra task formats (formats.yaml) ----------

/** "Predict the output": guess what a short snippet prints, then run it. */
export type PredictTask = {
  code: string;
  question: string;
  /** Exactly what the code prints (verified by the validator). */
  answer: string;
  /** Optional multiple choice; one of them equals `answer`. Free text otherwise. */
  choices?: string[];
  explain: string;
};

/** "Break Byte's code": find an input where Byte's function breaks the spec. */
export type BreakItTask = {
  /** Byte's pitch, e.g. "Tested it on 900, 3. Works!" */
  says: string;
  /** Byte's (buggy) function. */
  code: string;
  /** The spec in plain English. */
  spec: string;
  /** e.g. "split_bill({input})"; {input} is what the learner types. */
  call: string;
  /** What to type, e.g. "total_cents, people". */
  inputHint: string;
  /** Code the check needs (e.g. a spec predicate); "" if none. */
  helpers: string;
  /** Python expression: true when Byte's `result` meets the spec for {input}. */
  check: string;
  /** Does a crash in Byte's code count as breaking it? */
  crashCounts: boolean;
  /** An input where Byte's code is fine (Byte's own test). The counterexample is never shipped. */
  normalInput: string;
  /** Nudge after an input that doesn't break it. */
  miss: string;
  explain: string;
};

/** One line of a Parsons puzzle. Only distractors carry an `explain`. */
export type ParsonsBlock = { id: number; text: string; explain?: string };

/** "Put the lines in order" (Parsons puzzle) with Byte's wrong lines mixed in. */
export type ParsonsTask = {
  goal: string;
  /** Every line (correct ones and distractors), already shuffled; `id` is the position here. */
  blocks: ParsonsBlock[];
  /** Asserts run after the learner's program ("" if none). */
  check: string;
  /** What the program + check must print, if set. */
  expectedOutput?: string;
  explain: string;
};

/**
 * "Trace table": predict each watched variable's value, step by step. The real values
 * are never shipped: "Check" traces the code in Python (lib/runner/formats.py).
 */
export type TraceTask = {
  /** A short function and a call to it. */
  code: string;
  /** Variable names (the table's columns). */
  watch: string[];
  /** Rows to fill: one per line that gives a watched variable a new value. */
  rows: number;
  explain: string;
};

export type TaskFormatsContent = {
  predict: PredictTask[];
  breakIt: BreakItTask[];
  parsons: ParsonsTask[];
  /** Optional so older callers (and tests) can leave it out. */
  trace?: TraceTask[];
};

export type BytePromptVerdict = "good" | "vague" | "wrong";

/** One prompt the learner could send Byte, and what Byte would write back. */
export type BytePromptOption = {
  prompt: string;
  responseCode: string;
  verdict: BytePromptVerdict;
  feedback: string;
};

/** "Ask Byte" card (byte.yaml `prompt`): pick the prompt that gets useful code. */
export type BytePrompt = {
  goal: string;
  options: BytePromptOption[];
  /** 0-based index of the best (only "good") option. */
  best: number;
};

export type ByteContent = { suggestion?: ByteSuggestion; prompt?: BytePrompt };

export type Ticket = {
  /** e.g. "s01-t01" (from ticket.yaml) */
  id: string;
  /** folder name, e.g. "t01-welcome" */
  slug: string;
  seasonId: string;
  /** 1-based position within the season */
  number: number;
  title: string;
  type: TicketType;
  level: Level;
  track: string;
  concepts: string[];
  newConcept: string;
  estimatedMinutes: number;
  testsVisible: boolean;
  filesEditable: string[];
  story: string;
  /** Short lesson on the ticket's new concept (concept.md), if any. */
  concept: string | null;
  hints: string[];
  questions: Question[];
  /** path -> file contents. The reference solution is never sent to the browser. */
  starter: Record<string, string>;
  tests: Record<string, string>;
  /** Only on `review` tickets. */
  review?: Review;
  /** Only on `incident` tickets. */
  incident?: Incident;
  /** Byte's suggestion and/or prompt card (byte.yaml), if any. */
  byte?: ByteContent;
  /** Extra task formats (formats.yaml), if any. */
  formats?: TaskFormatsContent;
  /**
   * True on the final exam's tickets (season.yaml `final: true`): no hints, no
   * lesson, no Byte, no concept label. Absent everywhere else.
   */
  final?: true;
  /**
   * ticket.yaml `tutorial: true`: Byte's suggestion here is a practice round (the
   * first tickets). The decision is recorded but left out of the human-in-the-loop score.
   */
  tutorial?: true;
  /**
   * Side-quest ("mystery bug") tickets of the Bug Bounty board (an off-chain season
   * that isn't the final): no concept label or lesson until solved. Absent elsewhere.
   */
  bounty?: BountyInfo;
};

/** What a Bug Bounty ticket reveals once solved, and what opens it. */
export type BountyInfo = {
  /** e.g. "off-by-one": "This was an off-by-one bug". Defaults to the concept's label. */
  bugKind: string;
  /** The ticket that taught the concept (ticket.yaml `requires`): it opens this one, and its lesson is linked. */
  requires: { id: string; title: string } | null;
};

/** A 2-minute daily code-reading challenge (content/warmups/*.yaml). */
export type Warmup = {
  id: string;
  title: string;
  concept: string;
  /** Ticket id that must be solved first (it introduced the concept). */
  after: string;
  code: string;
  question: string;
  choices: string[];
  answer: number;
  explain: string;
};

export type Season = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  /** false: off-chain (an unseen module, not part of the evolving codebase). Default true. */
  chain: boolean;
  /** true: the final exam ("Byte's Week Alone"). Default false. */
  final: boolean;
  tickets: Ticket[];
};

// ---------- the skills check (content/assessment/skills-check.yaml) ----------

export type SkillsCheckKind = "predict" | "catch_input" | "spot_line" | "pick_answer";

/**
 * One question. What the validator uses to verify the answer (reference code,
 * the fixed line, asserts) stays on the server.
 */
export type SkillsCheckItem = {
  id: string;
  kind: SkillsCheckKind;
  prompt: string;
  /** The snippet to read (absent on pick_answer, whose choices are code). */
  code?: string;
  choices: string[];
  /** 0-based index into choices. */
  answer: number;
  explain: string;
};

export type SkillsCheck = { title: string; intro: string; items: SkillsCheckItem[] };
