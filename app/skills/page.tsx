import SkillTree, { type Skill } from "@/components/SkillTree";
import { loadSeasons } from "@/lib/content/load";

export const metadata = { title: "Skills · Orbit Orders HQ" };

export default function SkillsPage() {
  const skills: Skill[] = loadSeasons().flatMap((s) =>
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
