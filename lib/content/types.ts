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
  tickets: Ticket[];
};
