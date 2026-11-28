// The names of DevJourney's drawn icons (components/icons/Icon.tsx). Kept in lib so
// game data (ranks and badges in lib/game/rules.ts) can name an icon without importing
// a component. Design: docs/design/human-pass-plan.md.
export const ICON_NAMES = [
  // Ticket types
  "bug", "ladle", "pager", "spoon", "recipe",
  // State of a ticket or a check
  "spike", "check", "cross", "burnt", "warning", "pending", "lock", "unlock", "pin", "flag",
  // Things on the ticket page
  "note", "book", "magnifier", "logs", "timer", "pencil", "play", "pause",
  // The office
  "flame", "mug", "wrench", "byte", "scooter", "posted", "gripper", "arm", "stamp",
  // Ranks
  "apron", "keys", "knife", "toque", "bell",
  // Badges
  "match", "swatter", "glasses", "extinguisher", "jar", "speech", "calendar",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
