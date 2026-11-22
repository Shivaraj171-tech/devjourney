import { notFound } from "next/navigation";
import TicketWorkspace from "@/components/TicketWorkspace";
import { allTickets, getTicket, loadSeasons } from "@/lib/content/load";
import { nextStoryTicketId, previousTicketId, type OrderSeason } from "@/lib/content/order";

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
  // such as the final exam never block the main story. Side quests (the Bug Bounty
  // board) are outside the story: each opens on its own `requires` and has no "next".
  // A side floor (the Robotics Lab) opens as a whole on its season's `requires`; inside it,
  // tickets open one after another.
  const order: OrderSeason[] = loadSeasons().map((s) => ({
    id: s.id,
    chain: s.chain,
    final: s.final,
    requires: s.requires ?? null,
    tickets: s.tickets.map((t) => ({ id: t.id, requires: t.bounty?.requires?.id ?? null })),
  }));
  const nextId = nextStoryTicketId(order, ticket.id);
  const next = nextId ? getTicket(nextId) : undefined;
  return (
    <TicketWorkspace
      ticket={ticket}
      prevTicketId={previousTicketId(order, ticket.id)}
      nextTicket={next ? { id: next.id, title: next.title } : null}
    />
  );
}
