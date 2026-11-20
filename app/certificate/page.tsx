import { notFound } from "next/navigation";
import Certificate from "@/components/Certificate";
import { finalExam } from "@/lib/content/load";

export const metadata = { title: "Human in the loop: verified · Orbit Orders HQ" };

export default function CertificatePage() {
  const exam = finalExam();
  if (!exam) notFound();
  return (
    <Certificate
      examTitle={exam.season.title}
      tickets={exam.season.tickets.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        reviewIssues: t.review?.issues.length ?? 0,
      }))}
    />
  );
}
