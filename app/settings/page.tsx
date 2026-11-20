import Settings from "@/components/Settings";
import { loadSeasons } from "@/lib/content/load";

export const metadata = { title: "Settings & backup · Orbit Orders HQ" };

export default function SettingsPage() {
  // Only ids reach the browser: a class report counts merged tickets per season.
  const seasons = loadSeasons().map((s) => ({ id: s.id, ticketIds: s.tickets.map((t) => t.id) }));
  return <Settings seasons={seasons} />;
}
