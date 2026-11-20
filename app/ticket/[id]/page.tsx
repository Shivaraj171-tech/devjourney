import { notFound } from "next/navigation";
import TicketWorkspace from "@/components/TicketWorkspace";
import { allTickets, getTicket, loadSeasons } from "@/lib/content/load";
import { previousTicketId } from "@/lib/content/order";

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
  // One long story: the first ticket of a season unlocks after the last ticket of the
  // nearest on-chain season before it (lib/content/order.ts), so off-chain seasons
  // such as the final exam never block the main story.
  const ordered = allTickets();
  const next = ordered[ordered.findIndex((t) => t.id === ticket.id) + 1];
  return (
    <TicketWorkspace
      ticket={ticket}
      prevTicketId={previousTicketId(loadSeasons(), ticket.id)}
      nextTicket={next ? { id: next.id, title: next.title } : null}
    />
  );
}
