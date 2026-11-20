import TeacherDashboard from "@/components/TeacherDashboard";
import { loadSeasons } from "@/lib/content/load";

// Not in the main nav: linked from the README and the settings page.
export const metadata = {
  title: "Teacher view · Orbit Orders HQ",
  description: "Read your class's DevJourney report codes. No accounts: everything stays in your browser.",
};

export default function TeacherPage() {
  // Floor names for the season ids found in report codes (same numbering as the HQ).
  const floors = loadSeasons().map((s, i) => ({ id: s.id, short: s.final ? "Final exam" : `Floor ${i + 1}`, title: s.title }));
  return <TeacherDashboard floors={floors} />;
}
