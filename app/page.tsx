import HQ, { type SeasonSummary, type SideFloorSummary } from "@/components/HQ";
import PythonPrefetch from "@/components/PythonPrefetch";
import { loadSeasons, loadSkillsCheck, loadWarmups, sideFloorSeasons, sideQuestSeasons, storySeasons } from "@/lib/content/load";
import type { Season } from "@/lib/content/types";
import type { BountyCard } from "@/lib/game/bounty";
import { BASE_XP } from "@/lib/game/rules";
import { profileContent } from "@/lib/content/profileContent";

// Only send what the office map needs to the browser (no code, no tests).
function summary(s: Season): SeasonSummary {
  return {
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
  };
}

export default function Home() {
  // The floors are the story (side quests such as the Bug Bounty board are shown apart).
  const story = storySeasons();
  const seasons: SeasonSummary[] = story.map(summary);
  // Side floors (the Robotics Lab): their own board, opened as a whole by one story ticket.
  const sideFloors: SideFloorSummary[] = sideFloorSeasons().flatMap((s) => {
    const floor = story.findIndex((x) => x.tickets.some((t) => t.id === s.requires));
    if (floor === -1) return [];
    const tickets = story[floor].tickets;
    const at = tickets.findIndex((t) => t.id === s.requires);
    const gateText = at === tickets.length - 1 ? `Floor ${floor + 1}` : `ticket #${tickets[at].number} of Floor ${floor + 1}`;
    return [{ ...summary(s), requires: s.requires as string, gateText, icon: s.icon ?? "🧪", label: s.shortTitle ?? s.title }];
  });
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
      <HQ seasons={seasons} sideFloors={sideFloors} bounties={bounties} warmups={loadWarmups()} hasSkillsCheck={loadSkillsCheck() !== null} profileContent={profileContent()} />
      <PythonPrefetch />
    </>
  );
}
