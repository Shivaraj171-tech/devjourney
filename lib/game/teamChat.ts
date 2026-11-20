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

export type ChatTicket = { id: string; number: number; title: string; type: TicketType; seasonId: string; seasonTitle: string };

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
          { id: `ship-${t.id}`, from: "leo", text: `Support queue just got quieter. Thanks for fixing ${q}! 🙌` },
          { id: `ship-${t.id}`, from: "leo", text: `A customer literally wrote “it works now?!” after ${q} went out. That was you.` },
        ],
        t.id,
      );
    case "feature":
      return pick<ChatMessage>(
        [
          { id: `ship-${t.id}`, from: "priya", text: `${q} is live? I'm putting it in Friday's newsletter 📣` },
          { id: `ship-${t.id}`, from: "priya", text: `Just demoed ${q} to a restaurant owner. She said “finally”. 🎉` },
        ],
        t.id,
      );
    case "review":
      return { id: `ship-${t.id}`, from: "maya", text: `Good review on ${q}. A bug caught before merge is the cheapest bug there is.` };
    case "incident":
      return { id: `ship-${t.id}`, from: "leo", text: `Production's back up after ${q}! The 🚨 channel can finally breathe.` };
    case "read":
      return { id: `ship-${t.id}`, from: "maya", text: `Nice work on ${q}. Reading code you didn't write is half of this job.` };
  }
}

const BYTE_LINES: Partial<Record<SuggestionOutcome, string>> = {
  caught: "You were right, my suggestion would have broken it. Noted for my next training run. 📝",
  "waved-through": "Hmm, the checks went red after my suggestion. Sorry! Always run the tests on my code.",
  trusted: "Thanks for checking my work before shipping it. Trust, but verify. ✅",
  doubted: "That one was actually fine! But honestly? I respect the caution.",
};

/** The chat, oldest message first (3-6 messages). */
export function teamChat(input: ChatInput): ChatMessage[] {
  const name = input.playerName === "You" ? "new dev" : input.playerName;
  const msgs: ChatMessage[] = [];
  const last = input.solved[input.solved.length - 1];

  if (!last) {
    msgs.push({ id: "welcome", from: "maya", text: `Everyone, say hi to ${name}, our newest developer! 👋` });
    msgs.push({ id: "byte-hello", from: "byte", text: "Hi! I'm Byte. I write code very fast. Most of it is probably fine. 🤖" });
    msgs.push({ id: "sam-hello", from: "sam", text: "Other new hire here. I already closed a ticket this morning. No pressure. 😏" });
  } else {
    msgs.push(shipped(last));
    const outcome = input.last?.byteOutcome;
    if (outcome && BYTE_LINES[outcome]) msgs.push({ id: `byte-${last.id}`, from: "byte", text: BYTE_LINES[outcome]! });

    if (input.flow >= 3) {
      msgs.push({ id: "flow", from: "sam", text: `${input.flow} clean merges in a row?! Okay, now you're just showing off. 😤` });
    } else if (input.last?.clean) {
      msgs.push({ id: `clean-${last.id}`, from: "sam", text: "First try, no hints? Teach me your ways." });
    } else if ((input.last?.hintsUsed ?? 0) > 0) {
      msgs.push({ id: `hints-${last.id}`, from: "maya", text: "Saw you used a hint. Good: asking for help early is a senior habit." });
    } else if (input.xp > input.samXp) {
      msgs.push({ id: "rival-ahead", from: "sam", text: "You passed me on the leaderboard?! Rematch tomorrow." });
    } else {
      msgs.push({ id: "rival-behind", from: "sam", text: `I'm ${input.samXp - input.xp} XP ahead. Just saying. 🏃` });
    }
  }

  if (input.streak >= 2) {
    msgs.push({ id: `streak-${input.streak}`, from: "priya", text: `${input.streak}-day streak! 🔥 That's more consistent than our coffee machine.` });
  }

  if (last && input.seasonFinished) {
    msgs.push({
      id: `season-${last.seasonId}`,
      from: "maya",
      text: `That's “${last.seasonTitle}” done. I wrote up your performance review. 📋`,
      link: { href: `/review/${last.seasonId}`, label: "Read your review" },
    });
  }

  if (input.next) {
    msgs.push({
      id: `next-${input.next.id}`,
      from: "maya",
      text: input.solved.length === 0 ? `Your first ticket is ready, ${name}: #${input.next.number} ${sentence(input.next.title)}` : `Next up: #${input.next.number} ${sentence(input.next.title)} Ping me if you get stuck.`,
      link: { href: `/ticket/${input.next.id}`, label: "Open ticket" },
    });
  } else if (last) {
    msgs.push({ id: "all-done", from: "maya", text: "The backlog is empty. I didn't know that was possible. 🏆" });
  }
  return msgs;
}
