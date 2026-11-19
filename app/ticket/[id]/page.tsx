import { notFound } from "next/navigation";
import TicketWorkspace from "@/components/TicketWorkspace";
import { allTickets, getTicket } from "@/lib/content/load";

export function generateStaticParams() {
  return allTickets().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/ticket/[id]">) {
  const { id } = await params;
  const ticket = getTicket(id);
  return { title: ticket ? `#${ticket.number} ${ticket.title} · Orbit Orders HQ` : "Ticket not found" };
}

export default async function TicketPage({ params }: PageProps<"/ticket/[id]">) {
  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket) notFound();
  // One long story: the first ticket of a season unlocks after the last ticket of the season before.
  const ordered = allTickets();
  const index = ordered.findIndex((t) => t.id === ticket.id);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  return (
    <TicketWorkspace
      ticket={ticket}
      prevTicketId={prev ? prev.id : null}
      nextTicket={next ? { id: next.id, title: next.title } : null}
    />
  );
}
