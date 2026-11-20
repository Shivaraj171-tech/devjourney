import SkillTree, { type Skill } from "@/components/SkillTree";
import { storySeasons } from "@/lib/content/load";

export const metadata = { title: "Skills · Orbit Orders HQ" };

export default function SkillsPage() {
  // The final exam teaches no new concept (it's an exam), so it has no skills here.
  // Side quests (the Bug Bounty board) revisit concepts taught on the floors, so they add none either.
  const skills: Skill[] = storySeasons().filter((s) => !s.final).flatMap((s) =>
    s.tickets.map((t) => ({
      ticketId: t.id,
      ticketTitle: t.title,
      seasonTitle: s.title,
      concept: t.newConcept,
      track: t.track,
      lesson: t.concept,
    })),
  );
  return <SkillTree skills={skills} />;
}
