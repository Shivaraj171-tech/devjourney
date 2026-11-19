import HQ, { type SeasonSummary } from "@/components/HQ";
import { loadSeasons, loadWarmups } from "@/lib/content/load";

export default function Home() {
  // Only send what the office map needs to the browser (no code, no tests).
  const seasons: SeasonSummary[] = loadSeasons().map((s) => ({
    id: s.id,
    title: s.title,
    intro: s.intro,
    tickets: s.tickets.map((t) => ({
      id: t.id,
      number: t.number,
      title: t.title,
      type: t.type,
      newConcept: t.newConcept,
      estimatedMinutes: t.estimatedMinutes,
      hasQuiz: t.questions.length > 0,
      questionCount: t.questions.length,
      seasonId: t.seasonId,
    })),
  }));
  return <HQ seasons={seasons} warmups={loadWarmups()} />;
}
