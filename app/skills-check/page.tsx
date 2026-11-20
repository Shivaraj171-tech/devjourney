import { notFound } from "next/navigation";
import SkillsCheck from "@/components/SkillsCheck";
import { finalExam, loadSkillsCheck } from "@/lib/content/load";

export const metadata = { title: "Skills check · Orbit Orders HQ" };

export default function SkillsCheckPage() {
  const check = loadSkillsCheck();
  if (!check) notFound();
  const exam = finalExam();
  return (
    <SkillsCheck
      check={check}
      finalGate={exam?.gate ?? []}
      finalTickets={exam?.season.tickets.map((t) => ({ id: t.id, title: t.title })) ?? []}
    />
  );
}
