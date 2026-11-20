import HQ, { type SeasonSummary } from "@/components/HQ";
import PythonPrefetch from "@/components/PythonPrefetch";
import { loadSeasons, loadSkillsCheck, loadWarmups, sideQuestSeasons, storySeasons } from "@/lib/content/load";
import type { BountyCard } from "@/lib/game/bounty";
import { BASE_XP } from "@/lib/game/rules";

export default function Home() {
  // Only send what the office map needs to the browser (no code, no tests).
  // The floors are the story (side quests such as the Bug Bounty board are shown apart).
  const seasons: SeasonSummary[] = storySeasons().map((s) => ({
    id: s.id,
    title: s.title,
    intro: s.intro,
    chain: s.chain,
    final: s.final,
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
      timeLimitMinutes: t.incident?.timeLimitMinutes,
    })),
  }));
  const all = loadSeasons();
  const bounties: BountyCard[] = sideQuestSeasons().flatMap((s) =>
    s.tickets.map((t) => {
      const req = t.bounty?.requires;
      const reqSeason = req ? all.find((x) => x.tickets.some((y) => y.id === req.id)) : undefined;
      const reqTicket = reqSeason?.tickets.find((y) => y.id === req?.id);
      return {
        id: t.id,
        number: t.number,
        title: t.title,
        xp: BASE_XP[t.level],
        estimatedMinutes: t.estimatedMinutes,
        bugKind: t.bounty?.bugKind ?? t.newConcept,
        requires: req && reqSeason && reqTicket ? { id: req.id, title: req.title, number: reqTicket.number, seasonTitle: reqSeason.title } : null,
      };
    }),
  );
  return (
    <>
      <HQ seasons={seasons} bounties={bounties} warmups={loadWarmups()} hasSkillsCheck={loadSkillsCheck() !== null} />
      <PythonPrefetch />
    </>
  );
}
