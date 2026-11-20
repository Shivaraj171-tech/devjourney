import { notFound } from "next/navigation";
import PerformanceReviewView from "@/components/PerformanceReview";
import { loadSeasons } from "@/lib/content/load";

export function generateStaticParams() {
  return loadSeasons().map((s) => ({ season: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/review/[season]">) {
  const { season } = await params;
  const s = loadSeasons().find((x) => x.id === season);
  return { title: s ? `Performance review: ${s.title} · Orbit Orders HQ` : "Review not found" };
}

export default async function ReviewPage({ params }: PageProps<"/review/[season]">) {
  const { season: id } = await params;
  const seasons = loadSeasons();
  const index = seasons.findIndex((s) => s.id === id);
  if (index === -1) notFound();
  const season = seasons[index];
  const next = seasons[index + 1];
  return (
    <PerformanceReviewView
      floor={index + 1}
      season={{ id: season.id, title: season.title }}
      tickets={season.tickets.map((t) => ({
        id: t.id,
        number: t.number,
        title: t.title,
        type: t.type,
        newConcept: t.newConcept,
        questionCount: t.questions.length,
      }))}
      next={next ? { title: next.title, firstTicketId: next.tickets[0]?.id ?? null } : null}
    />
  );
}
