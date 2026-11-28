// DevJourney's icon set, drawn for this product (docs/design/human-pass-plan.md).
//
// One hand for every icon: a 24 x 24 grid, one 1.6 px stroke in the text colour, round
// caps and joins, no fills. The paths are drawn a little off true (a corner not quite
// square, a curve that doesn't close perfectly), like marker on an order ticket, so the
// set reads as made for this kitchen rather than taken from a library.
//
// Every object comes from Orbit Orders' world: a tasting spoon for a code review, a
// receipt spike for "merged", a pager for an incident, a burner flame for the streak.
//
// Use: <Icon name="spike" /> next to visible text (it is aria-hidden by default), or
// <Icon name="wrench" label="Settings" /> when the icon stands alone.
import type { IconName } from "@/lib/icons";

/** Each icon is a list of path data. A path starting with "." is a dot (an ink spot). */
const PATHS: Record<IconName, string[]> = {
  // ---------- ticket types ----------
  /** Bug fix: a kitchen beetle. */
  bug: [
    "M12 7.3c2.8-.1 4.6 2.4 4.5 5.6-.1 3.3-2 5.8-4.6 5.8-2.5 0-4.4-2.6-4.4-5.9 0-3 1.8-5.4 4.5-5.5z",
    "M9.9 7.7c.3-1.5 1.1-2.4 2.2-2.4 1.2 0 1.9.9 2.2 2.3",
    "M12.05 9.7v8.8",
    "M7.7 11.2 5.3 10M7.6 14.1H4.9M8.1 16.8l-2.3 1.6M16.4 11.1l2.4-1.2M16.5 14.2h2.6M15.9 16.8l2.3 1.5",
    "M10.7 5.6 9.4 3.8M13.4 5.5l1.3-1.8",
  ],
  /** Feature: a ladle, a new dish going out. */
  ladle: [
    "M4.2 13.2c.1 3.3 2.6 5.6 5.9 5.6 3.3 0 5.7-2.3 5.8-5.7-3.9.2-7.8.2-11.7.1z",
    "M15.9 13.1 18.8 4.7",
    "M18.8 4.7c.3-.9 1.4-1 1.7-.2",
  ],
  /** Incident: the on-call pager. */
  pager: [
    "M4.7 7.2h14.5c.9 0 1.5.6 1.5 1.5v7c0 .9-.6 1.5-1.5 1.5H4.8c-.9 0-1.5-.6-1.6-1.5V8.7c0-.9.7-1.5 1.5-1.5z",
    "M6.3 9.7l8.2-.1v3.3l-8.1.1z",
    ".M17.5 10.3", ".M17.5 13.4",
    "M9.2 4.6c1.8-.7 3.7-.7 5.5.1",
  ],
  /** Code review: a tasting spoon. Taste it before it goes out. */
  spoon: [
    "M5.9 4.5c1.9-1.2 4.7.1 5.6 2.6.8 2.4-.2 4.6-2.2 5.1-2 .4-4-1.1-4.6-3.4-.4-1.8.1-3.5 1.2-4.3z",
    "M10.5 11.6l8.2 8.5c.4.4 1 .4 1.3 0 .3-.3.3-.8 0-1.2l-8.3-8.4",
  ],
  /** Read the code: a recipe card. */
  recipe: [
    "M6.2 3.6h8.6l3.9 3.9v12.1c0 .6-.4.9-.9.9H6.3c-.5 0-.9-.4-.9-.9V4.5c0-.5.3-.9.8-.9z",
    "M14.7 3.7v3.9h3.9",
    "M8.4 11.1h7.3M8.4 14.2h6.3M8.4 17.2h4.2",
  ],

  // ---------- state ----------
  /** Merged: the ticket is on the receipt spike. */
  spike: [
    "M6.8 20.4h10.5",
    "M12 3.6v4.5M12 16.4v3.9",
    "M7.6 8.2l8.8-.1v7.7l-1.5-1-1.4 1-1.5-1-1.5 1-1.4-1-1.5 1z",
    "M9.6 11.4h4.7",
  ],
  check: ["M4.9 12.8c1.5 1.2 2.9 2.6 4.1 4.2 2.9-4 6.1-7.3 10.1-10.3"],
  cross: ["M6.3 6.1c3.9 3.8 7.7 7.9 11.5 12M17.7 6.2c-3.9 3.7-7.6 7.7-11.4 11.9"],
  /** A crash: a burnt pan, still smoking. */
  burnt: [
    "M3.9 14.3c0-2.6 2.3-4.4 5.6-4.4 3.4 0 5.7 1.9 5.6 4.5-.1 2.4-2.4 4.1-5.6 4.1-3.3 0-5.6-1.7-5.6-4.2z",
    "M15.1 13.6l5.4-1.4",
    "M7.8 7.7c-.8-1 .7-1.8-.1-3.1M11.1 7.5c-.8-1 .7-1.8-.1-3",
  ],
  warning: [
    "M11.1 4.9c.4-.7 1.4-.7 1.8 0l7.3 12.9c.4.7-.1 1.5-.9 1.5H4.7c-.8 0-1.3-.8-.9-1.5z",
    "M12 9.8v4.3",
    ".M12 16.6",
  ],
  /** Not run yet: an empty box on the checklist. */
  pending: ["M6.1 6.2l11.7-.2.2 11.8-11.8.2z"],
  lock: [
    "M6.1 10.6h11.8c.5 0 .9.4.9.9v7.6c0 .6-.4 1-1 1H6.2c-.6 0-1-.4-1-1v-7.6c0-.5.4-.9.9-.9z",
    "M8.3 10.5V7.7c0-2.3 1.6-3.9 3.7-3.9 2.2 0 3.8 1.6 3.8 3.9v2.8",
    "M12 14.2v2.3",
  ],
  unlock: [
    "M6.1 10.6h11.8c.5 0 .9.4.9.9v7.6c0 .6-.4 1-1 1H6.2c-.6 0-1-.4-1-1v-7.6c0-.5.4-.9.9-.9z",
    "M8.3 10.5V7.7c0-2.3 1.6-3.9 3.7-3.9 1.8 0 3.2 1.1 3.6 2.8",
    "M12 14.2v2.3",
  ],
  /** Where Python stopped. */
  pin: [
    "M12 20.9c-.4-.5-5.6-6.3-5.6-10.5 0-3.2 2.5-5.8 5.6-5.8 3.2 0 5.7 2.6 5.6 5.8 0 4.2-5.2 10-5.6 10.5z",
    "M12 8.6c1 0 1.7.8 1.7 1.7 0 1-.8 1.8-1.7 1.8-1 0-1.7-.8-1.7-1.8 0-.9.8-1.7 1.7-1.7z",
  ],
  /** A review flag on a line. */
  flag: [
    "M6.2 20.5V4.3",
    "M6.3 4.9c3.9-1.6 6.5 1.7 11.4-.1v8.4c-4.9 1.8-7.5-1.6-11.4 0",
  ],

  // ---------- the ticket page ----------
  /** A hint: a folded note from the chef. */
  note: [
    "M5.4 5.2l12.9-.6.5 10.9-4.4 4.2-8.4.4z",
    "M18.8 15.5l-4.5.2.1 4",
    "M8.3 9.1h7.2M8.4 12.1h5.1",
  ],
  /** A lesson: an open cookbook. */
  book: [
    "M12 6.7c-1.9-1.3-4.4-1.9-7.6-1.8v12.6c3.2-.1 5.6.5 7.6 1.9 2-1.4 4.4-2 7.6-1.9V4.9c-3.2-.1-5.7.5-7.6 1.8z",
    "M12 6.8v12.5",
  ],
  /** Step through: look closely at each line. */
  magnifier: [
    "M10.4 4.6c3.2 0 5.7 2.6 5.7 5.8 0 3.1-2.6 5.7-5.8 5.7-3.1 0-5.7-2.6-5.6-5.8 0-3.2 2.5-5.7 5.7-5.7z",
    "M14.6 14.8l4.9 4.8",
  ],
  /** Production logs: a long receipt roll. */
  logs: [
    "M7 3.8h10v16.4l-1.7-1.2-1.6 1.2-1.7-1.2-1.6 1.2-1.7-1.2L7 20.2z",
    "M9.4 8h5.2M9.4 11h5.1M9.4 14h3.2",
  ],
  /** The incident clock: a kitchen timer. */
  timer: [
    "M12 6.8c3.6 0 6.4 2.8 6.4 6.4 0 3.6-2.9 6.5-6.4 6.5-3.6 0-6.4-2.9-6.4-6.5 0-3.6 2.8-6.4 6.4-6.4z",
    "M10.6 4.2h2.8M12 4.3v2.4",
    "M12 13.2l2.6-2.2",
  ],
  pencil: [
    "M5.1 18.9l.8-3.6 9.8-9.8c.7-.7 1.7-.7 2.4 0l.4.4c.7.7.7 1.7 0 2.4L8.7 18.1z",
    "M14.2 7.1l2.7 2.8",
  ],
  play: ["M8 5.6c3.6 2 6.9 4.1 10.2 6.4-3.3 2.3-6.6 4.4-10.2 6.4z"],
  pause: ["M9 5.8v12.5M15 5.7v12.5"],

  // ---------- the office ----------
  /** The streak: a burner flame. */
  flame: [
    "M12 20.6c-3.6 0-5.8-2.3-5.8-5.3 0-3.4 3-5.3 3.6-9.2 2 1.3 2.9 3 3 4.6.9-.6 1.5-1.7 1.6-2.9 2.1 1.9 3.4 4.4 3.4 7.4 0 3.1-2.3 5.4-5.8 5.4z",
    "M12 20.4c-1.5 0-2.4-1-2.4-2.3 0-1.4 1.2-2.2 2.3-3.7 1 1.5 2.5 2.3 2.5 3.7 0 1.3-1 2.3-2.4 2.3z",
  ],
  /** The warm-up: a mug of coffee. */
  mug: [
    "M5.6 9.1h10.1v7.4c0 2-1.6 3.6-3.6 3.6H9.2c-2 0-3.6-1.6-3.6-3.6z",
    "M15.8 10.9h1.4c1.4 0 2.4 1 2.4 2.3 0 1.4-1 2.4-2.4 2.4h-1.5",
    "M8.6 6.6c-.6-.9.6-1.6 0-2.6M12.4 6.6c-.6-.9.6-1.6 0-2.6",
  ],
  /** Settings. */
  wrench: [
    "M15 4.2c-2.2.5-3.6 2.7-3 4.9l-7.5 7.6c-.8.8-.8 2 0 2.7.8.8 1.9.8 2.7 0l7.6-7.5c2.2.6 4.4-.8 4.9-3l-2.6.5-1.9-1.9z",
  ],
  /** Byte, the office AI: a little ticket printer with two eyes. It prints code fast. */
  byte: [
    "M4.8 9.3h14.4c.6 0 1 .4 1 1v6.1c0 .6-.4 1-1 1H4.8c-.6 0-1-.4-1-1v-6.1c0-.6.4-1 1-1z",
    "M7.6 9.2V4.4l8.8-.1v4.9",
    "M9.7 6.5h4.6",
    ".M9.3 13.1", ".M14.7 13.1",
    "M7.4 17.5v2.3h9.2v-2.3",
  ],
  /** Delivery, and the app itself: the scooter with its box. */
  scooter: [
    "M6.4 15.3c1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4z",
    "M17.6 15.3c1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4z",
    "M8.8 17.7h5.6l2.1-5.3",
    "M4.4 9.4h5.5l-.1 4.1H4.4z",
    "M16.5 12.4 15 6.2h2.6",
  ],
  /** Bug Bounty: a notice pinned to the board. */
  posted: [
    "M6.1 6.8l11.6-.5.7 13.1-11.7.5z",
    "M12 4.1c.8 0 1.4.6 1.4 1.3 0 .8-.6 1.4-1.4 1.4-.8 0-1.4-.6-1.4-1.4 0-.7.6-1.3 1.4-1.3z",
    "M9 11.2h6M9.1 14.4h4.4",
  ],
  /** The Robotics Lab: Grabby's gripper. */
  gripper: [
    "M9.6 3.7h4.8M12 3.8v4.4",
    "M7.4 8.3h9.2",
    "M7.4 8.3v5.1l2.2 2.6M16.6 8.3v5.1l-2.2 2.6",
    "M10.5 19.6h3",
  ],
  /** The manipulator floors: a jointed arm on its base. */
  arm: [
    "M4.6 19.6h6.6",
    "M7.9 19.4 8.9 14.8",
    "M9 12.4c.7 0 1.2.5 1.2 1.2 0 .7-.5 1.2-1.2 1.2-.7 0-1.2-.5-1.2-1.2 0-.7.5-1.2 1.2-1.2z",
    "M10.1 13l5.5-3.6",
    "M15.6 9.4l2.7-1M15.6 9.4l1.1 2.5",
  ],
  /** The exam and the certificate: a rubber stamp. */
  stamp: [
    "M12 3.7c1.3 0 2.2.9 2.2 2.1 0 1.2-.9 2.2-2.2 2.2-1.2 0-2.2-1-2.2-2.2 0-1.2 1-2.1 2.2-2.1z",
    "M10.8 8.1v3.4M13.2 8.1v3.4",
    "M5.6 11.5h12.8c.5 0 .9.4.9.9v2.4H4.7v-2.4c0-.5.4-.9.9-.9z",
    "M5.5 18.6h13",
  ],

  // ---------- ranks ----------
  apron: [
    "M8.5 4.2c0 2 1.5 3.4 3.5 3.4s3.5-1.4 3.5-3.4",
    "M7.6 8.1h8.8l.9 11.2H6.7z",
    "M7.6 10.4l-3 .9M16.4 10.4l3 .9",
    "M9.8 13.8h4.4v2.6H9.8z",
  ],
  /** Trusted: they gave you the keys. */
  keys: [
    "M7.4 4.4c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.4-3-3 1.4-3 3-3z",
    "M9.6 9.6l8.9 8.9",
    "M15.4 15.5l1.9-1.9M17.4 17.5l1.6-1.6",
  ],
  /** Your own knife. */
  knife: [
    "M3.8 18.9c4.3-.6 9-3.6 12.2-7.4l-3.1-3.1c-3.1 3.2-7 6.8-9.1 10.5z",
    "M13.1 8.6l3.3-3.3c.9-.9 2.2-.9 3 0 .8.8.8 2.1 0 3l-3.3 3.3",
  ],
  /** The chef's hat. */
  toque: [
    "M7.3 14.1c-2-.4-3.3-2-3.2-3.9.1-2.1 1.9-3.6 4-3.5.6-1.8 2.2-3 3.9-3 1.8 0 3.4 1.2 3.9 3 2.1-.1 3.9 1.4 4 3.5.1 1.9-1.2 3.5-3.2 3.9",
    "M7.3 14v5.2h9.4V14",
    "M7.4 16.6h9.3",
  ],
  /** The bell at the pass. */
  bell: [
    "M4.3 17.6h15.4",
    "M5.6 17.5c0-3.8 2.8-6.6 6.4-6.6 3.6 0 6.4 2.8 6.4 6.6",
    "M12 10.9V8.9M10.7 8.8h2.6",
  ],

  // ---------- badges ----------
  /** Self-starter: strike your own match. */
  match: [
    "M5.8 19 14.9 9.9",
    "M14.8 10c-.8-1-.5-2.5.6-3.2 1.1-.7 2.5-.3 3 .8.5 1-.1 2.3-1.2 2.6",
    "M17.6 5.2c-.2-.9.4-1.5.3-2.3",
  ],
  /** Bug squasher: the fly swatter. */
  swatter: [
    "M13.2 3.9l6.9 6.9-3.9 3.9-6.9-6.9z",
    "M15.2 6.3l-2.5 2.5M17.5 8.6l-2.5 2.5",
    "M11.1 11.8 4.3 18.6",
  ],
  /** Eagle eye: reading glasses. */
  glasses: [
    "M7.2 11.6c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-1.7 1.4-3.1 3.1-3.1z",
    "M16.8 11.6c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-1.7 1.4-3.1 3.1-3.1z",
    "M10.2 13.9c1.1-.9 2.5-.9 3.6 0",
    "M4.2 13.6 5.8 7.4M19.8 13.6l-1.6-6.2",
  ],
  extinguisher: [
    "M8.6 9.1h6.8v10.1c0 .6-.4 1-1 1H9.6c-.6 0-1-.4-1-1z",
    "M10.4 9.1V6.7h3.2v2.4",
    "M13.6 6.8h2.2l2.6 2.2",
    "M10.2 4.6h4.6",
  ],
  /** Bug catcher: a bug caught in a jar. */
  jar: [
    "M7.2 8.2h9.6v10.6c0 .8-.6 1.4-1.4 1.4H8.6c-.8 0-1.4-.6-1.4-1.4z",
    "M6.6 5.1h10.8v3.1H6.6z",
    "M12 12.6c1 0 1.6.9 1.6 1.9 0 1-.7 1.9-1.6 1.9-.9 0-1.6-.9-1.6-1.9 0-1 .6-1.9 1.6-1.9z",
    "M10.4 14.1h-1M13.6 14.1h1",
  ],
  /** Prompt pro: what you say to Byte. */
  speech: [
    "M5.2 5.6h13.6c.6 0 1 .4 1 1v8.2c0 .6-.4 1-1 1h-7.4l-4 3.4v-3.4H5.2c-.6 0-1-.4-1-1V6.6c0-.6.4-1 1-1z",
    "M7.8 9.2h8.4M7.8 12.1h5.4",
  ],
  /** Survived week one: the week on the wall calendar, ticked. */
  calendar: [
    "M5 6.4l14-.1.1 13.3H5.1z",
    "M8.6 4.4V8M15.4 4.4V8",
    "M5 10.2h14",
    "M9.4 14.9l1.8 1.8 3.6-3.7",
  ],
};

type Props = {
  name: IconName;
  /** Size and colour utilities. Default: 1.15em square, in the text colour. */
  className?: string;
  /** Only when the icon stands alone: its accessible name. Otherwise it is hidden from screen readers. */
  label?: string;
};

export default function Icon({ name, className = "h-[1.15em] w-[1.15em]", label }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.2em] ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      data-icon={name}
    >
      {PATHS[name].map((d, i) =>
        d.startsWith(".") ? <path key={i} d={`${d.slice(1)}h.01`} strokeWidth={2.6} /> : <path key={i} d={d} />,
      )}
    </svg>
  );
}

/** Every icon, for the specimen sheet in tests and the design doc. */
export const ALL_ICONS = Object.keys(PATHS) as IconName[];
