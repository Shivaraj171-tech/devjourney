// "#orbit-team": the office chat on the HQ. Teammates react to what you just
// shipped, Byte reacts to how you handled its suggestion, Sam needles you about
// the leaderboard, and Maya points at what's next.
// A pure function of progress: no stored messages, nothing to sync, and the same
// progress always gives the same chat. Type imports only, so node can test it.
import type { TicketType } from "../content/types";
import type { SuggestionOutcome } from "./byte";

export type ChatAuthor = "maya" | "leo" | "priya" | "sam" | "byte";

export const CHAT_PEOPLE: Record<ChatAuthor, { name: string; avatar: string; role: string }> = {
  maya: { name: "Maya", avatar: "👩🏾‍💻", role: "Tech Lead" },
  leo: { name: "Leo", avatar: "🎧", role: "Support" },
  priya: { name: "Priya", avatar: "📣", role: "Marketing" },
  sam: { name: "Sam", avatar: "🧑‍🎓", role: "New hire" },
  byte: { name: "Byte", avatar: "🤖", role: "Office AI" },
};

export type ChatMessage = {
  /** Stable key (also used by tests). */
  id: string;
  from: ChatAuthor;
  text: string;
  /** Optional in-app link, e.g. the next ticket or a performance review. */
  link?: { href: string; label: string };
};

export type ChatTicket = { id: string; number: number; title: string; type: TicketType; seasonId: string; seasonTitle: string; exam?: boolean };

export type ChatInput = {
  playerName: string;
  /** Solved tickets, oldest solve first. */
  solved: ChatTicket[];
  /** How the last solved ticket went. */
  last?: { hintsUsed: number; clean: boolean; byteOutcome?: SuggestionOutcome };
  /** The next open ticket, if any. */
  next?: ChatTicket;
  /** True if `last` finished its season. */
  seasonFinished: boolean;
  streak: number;
  flow: number;
  xp: number;
  samXp: number;
};

/** Add a full stop unless the title already ends with punctuation ("…calculated?"). */
function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/** Small stable pick so the same ticket always gets the same line. */
function pick<T>(options: T[], seed: string): T {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

function shipped(t: ChatTicket): ChatMessage {
  const q = `“${t.title}”`;
  switch (t.type) {
    case "bug":
      return pick<ChatMessage>(
        [
          { id: `ship-${t.id}`, from: "leo", text: `Closed four support threads about ${q}. One customer replied “ok”. From her, that's a love letter.` },
          { id: `ship-${t.id}`, from: "leo", text: `A customer wrote “it works now??” after ${q} went out. Two question marks. I think that's gratitude.` },
        ],
        t.id,
      );
    case "feature":
      return pick<ChatMessage>(
        [
          { id: `ship-${t.id}`, from: "priya", text: `${q} goes in Friday's newsletter. Second item, under the lunch deal.` },
          { id: `ship-${t.id}`, from: "priya", text: `Showed ${q} to the owner of Noodle Nook. She said “finally” and went back to her stock count.` },
        ],
        t.id,
      );
    case "review":
      return { id: `ship-${t.id}`, from: "maya", text: `Good review on ${q}. A bug caught before merge costs one comment.` };
    case "incident":
      return { id: `ship-${t.id}`, from: "leo", text: `Production's back after ${q}. I've stopped refreshing the status page. Mostly.` };
    case "read":
      return { id: `ship-${t.id}`, from: "maya", text: `${q} is done. Most of this job is reading code somebody else wrote.` };
  }
}

const BYTE_LINES: Partial<Record<SuggestionOutcome, string>> = {
  caught: "You were right. Mine would have broken it. Writing that down somewhere I'll ignore.",
  "waved-through": "Checks went red after my change. My code, your accept button. Next time, run the tests on my code first.",
  trusted: "You checked it before you shipped it. It was right. Both of those should keep happening.",
  doubted: "That one was fine, for the record. Checking it was still the right call.",
};

/** The chat, oldest message first (3-6 messages). */
export function teamChat(input: ChatInput): ChatMessage[] {
  // No name set yet ("You"): leave the name out rather than say "say hi to new dev" (audit flaw 13).
  const named = input.playerName !== "You";
  const name = input.playerName;
  const msgs: ChatMessage[] = [];
  const last = input.solved[input.solved.length - 1];

  if (!last) {
    msgs.push({ id: "welcome", from: "maya", text: named ? `${name} starts today as a developer. Be nice. Sam, that means you.` : "New developer starts today. Be nice. Sam, that means you." });
    msgs.push({ id: "byte-hello", from: "byte", text: "I'm Byte. I write code very fast. Most of it is probably fine." });
    msgs.push({ id: "sam-hello", from: "sam", text: "other new hire. closed my first ticket at 9:04. no pressure." });
  } else {
    msgs.push(shipped(last));
    const outcome = input.last?.byteOutcome;
    if (outcome && BYTE_LINES[outcome]) msgs.push({ id: `byte-${last.id}`, from: "byte", text: BYTE_LINES[outcome]! });

    if (input.flow >= 3) {
      msgs.push({ id: "flow", from: "sam", text: `${input.flow} clean merges in a row? ok who's helping you` });
    } else if (input.last?.clean) {
      const text = pick(["first try, no hints? show me how. i'll pretend i knew.", "no hints? i used three on mine. don't tell maya."], last.id);
      msgs.push({ id: `clean-${last.id}`, from: "sam", text });
    } else if ((input.last?.hintsUsed ?? 0) > 0) {
      msgs.push({ id: `hints-${last.id}`, from: "maya", text: "You used a hint. Good. Ask at minute ten, not at 6 p.m." });
    } else if (input.xp > input.samXp) {
      const text = pick(["you passed me on the leaderboard? on a weekday? rematch tomorrow.", "ok you're ahead. i'm choosing to find this motivating."], last.id);
      msgs.push({ id: "rival-ahead", from: "sam", text });
    } else {
      const gap = input.samXp - input.xp;
      const text = pick(
        [
          `i'm ${gap} XP ahead. not that i check. i check hourly.`,
          `${gap} XP ahead of you. also every test customer called Sam is me, and i'd like a refund.`,
        ],
        last.id,
      );
      msgs.push({ id: "rival-behind", from: "sam", text });
    }
  }

  if (input.streak >= 2) {
    msgs.push({ id: `streak-${input.streak}`, from: "priya", text: `${input.streak} days in a row. The coffee machine hasn't managed that since March.` });
  }

  if (last && input.seasonFinished) {
    msgs.push({
      id: `season-${last.seasonId}`,
      from: "maya",
      text: `“${last.seasonTitle}” is done. I wrote your performance review. Read it before Monday.`,
      link: { href: `/review/${last.seasonId}`, label: "Read your review" },
    });
  }

  if (input.next) {
    msgs.push({
      id: `next-${input.next.id}`,
      from: "maya",
      text: input.solved.length === 0 ? `Your first ticket is ready${named ? `, ${name}` : ""}: #${input.next.number} ${sentence(input.next.title)}` : input.next.exam
          ? `Final exam: #${input.next.number} ${sentence(input.next.title)} I'm away all week. It's you and the checks.`
          : `Next: #${input.next.number} ${sentence(input.next.title)} Stuck for more than 20 minutes? Ping me.`,
      link: { href: `/ticket/${input.next.id}`, label: "Open ticket" },
    });
  } else if (last) {
    msgs.push({ id: "all-done", from: "maya", text: "Backlog's empty. I didn't know it could do that." });
  }
  return msgs;
}
