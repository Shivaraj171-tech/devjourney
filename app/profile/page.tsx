import CodingProfile from "@/components/CodingProfile";
import { profileContent } from "@/lib/content/profileContent";

export const metadata = { title: "My coding profile · Orbit Orders HQ" };

export default function ProfilePage() {
  // Concepts, practice items and edge-case check names only: no code, tests or answers.
  return <CodingProfile content={profileContent()} />;
}
