import SkillTree, { type Skill } from "@/components/SkillTree";
import { loadSeasons } from "@/lib/content/load";

export const metadata = { title: "Skills · Orbit Orders HQ" };

export default function SkillsPage() {
  // The final exam teaches no new concept (it's an exam), so it has no skills here.
  const skills: Skill[] = loadSeasons().filter((s) => !s.final).flatMap((s) =>
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
