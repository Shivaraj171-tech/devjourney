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
  hints: string[];
  questions: Question[];
  /** path -> file contents. The reference solution is never sent to the browser. */
  starter: Record<string, string>;
  tests: Record<string, string>;
  /** Only on `review` tickets. */
  review?: Review;
  /** Only on `incident` tickets. */
  incident?: Incident;
};

export type Season = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  tickets: Ticket[];
};
