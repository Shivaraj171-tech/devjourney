// DEV-ONLY preview: renders a ticket's extra task formats (formats.yaml) on their own,
// so they can be tried and end-to-end tested before they are wired into the ticket
// workspace. Not linked from anywhere in the app (keep it out of the nav).
import Link from "next/link";
import { notFound } from "next/navigation";
import TaskFormats from "@/components/TaskFormats";
import { allTickets, getTicket } from "@/lib/content/load";
import { hasTaskFormats } from "@/lib/game/formats";

export function generateStaticParams() {
  return allTickets()
    .filter(hasTaskFormats)
    .map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/dev/formats/[id]">) {
  const { id } = await params;
  const ticket = getTicket(id);
  return {
    title: ticket ? `Formats preview: #${ticket.number} ${ticket.title}` : "Not found",
    robots: { index: false, follow: false },
  };
}

export default async function DevFormatsPage({ params }: PageProps<"/dev/formats/[id]">) {
  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket || !hasTaskFormats(ticket)) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p className="text-xs text-amber-300">Dev preview (not linked in the app)</p>
      <h1 className="mt-1 text-lg font-semibold text-white">
        {ticket.id} · {ticket.title}
      </h1>
      <p className="mb-4 text-sm text-slate-400">
        <Link href={`/ticket/${ticket.id}/`} className="text-cyan-300 underline">
          Open the ticket
        </Link>
      </p>
      <TaskFormats ticket={{ id: ticket.id, formats: ticket.formats }} />
    </div>
  );
}
