"use client";
// One line on top of Byte's suggestion card, only for learners whose profile says
// "trusts Byte quickly" (lib/game/profile.ts), and only until they decide.
import { BYTE_TRUST_NUDGE } from "@/lib/game/help";
import { hasHabit } from "@/lib/game/profile";
import { useProgress, type TicketProgress } from "@/lib/progress/store";
import { useHabits } from "@/lib/useCodingProfile";

export default function ByteTrustNudge({ tp }: { tp: TicketProgress }) {
  const habits = useHabits(useProgress());
  if (tp.byteSuggestion || !hasHabit(habits, "trusts-byte")) return null;
  return (
    <p data-testid="byte-trust-nudge" role="note" className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">
      <span aria-hidden>💡 </span>
      {BYTE_TRUST_NUDGE}
    </p>
  );
}
