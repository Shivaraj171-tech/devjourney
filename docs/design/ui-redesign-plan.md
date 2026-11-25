# UI redesign plan: home screen and ticket page

Scope (founder's call, 2026-11-25): fix every issue in the UI audit
(`research_notes/Study platform build and audit/audit_ui_ux.md`), and redesign the home screen
(HQ) and the ticket page. Story, content and features stay the same. New visitors also see the
side floors (Robotics Lab, Manipulators, Bug Bounty) as locked floors, with a preview of what is
inside and what opens them.

Process: the `frontend-design` skill. A first draft, then a review against the brief and the
"generic AI look" list, then the revised plan that was built. The revisions are listed in their
own section.

## Subject, audience, job

- **Subject:** a junior developer's first weeks at Orbit Orders, a small food-delivery startup.
  The work comes as tickets. An AI teammate, Byte, writes code fast but not always right.
- **Audience:** total beginners, often on a phone or a 1280x800 laptop. Some come back for the
  robotics floors.
- **Primary job of each screen:**
  - Home: start (or continue) the next ticket. One button.
  - Ticket page: change the code, run the checks, read what they say.

The subject's own vernacular gives the visual idea. Orbit Orders is a food-delivery company,
and a restaurant kitchen also runs on tickets. An order ticket is a narrow slip of thermal paper
with a big order number, clipped to a rail. The developer's ticket and the kitchen's order
ticket are the same object. That slip is the one memorable element; everything around it stays
quiet.

## Colour (revised)

Six named colours. The neutrals are re-mapped into Tailwind's `slate` scale, so every page
(skills, profile, settings and so on) picks them up, not only the two redesigned screens.

| Name | Dark theme | Light theme | Role |
|---|---|---|---|
| Night shift | `#131833` | `#F4F6FB` (Daylight) | Page background |
| Console | `#1B2142` | `#FFFFFF` | Panels, the editor's chrome |
| Thermal paper | `#E9EDF6` | `#E9EDF6` | The ticket slip (same in both themes, ink `#1A2140` on it) |
| Order-up amber | `#FFB224` | `#FFB224` | The one primary action per screen, ink text on it (10.9:1) |
| Byte violet | `#8B7CF6` | `#6A5AE0` | Everything the AI says or suggests |
| CI green / CI red | `#2FBF71` / `#F0545C` | `#147A45` / `#C42A33` | Check results only, never decoration |

- Amber is the only "press me" colour. Green no longer means "button"; it only means "a check
  passed". That separation fixes the 3.65:1 white-on-emerald Run button (now ink on amber), and
  it teaches the learner that green is earned.
- Light theme: the same tokens, plus the accent scales inverted (50 ↔ 950, 100 ↔ 900 …). In light
  mode `text-white` maps to the ink colour, so every older page stays readable. It follows the
  system setting. Settings has a Theme choice (System / Dark / Light), applied before first paint
  by a small inline script (Next's "preventing flash before hydration" guide).

## Type (revised)

There is no network at build or run time, and `next/font/google` failed before. So:

- **Headings and the ticket slip:** a rounded system stack: `ui-rounded, "SF Pro Rounded",
  "Arial Rounded MT", "Nunito", "Varela Round", system-ui, sans-serif`. Rounded terminals read as
  friendly and a little hand-made. It shows on Apple devices and degrades to the system sans
  elsewhere (as in this container's screenshots).
- **Body:** `system-ui` stack, 16 px base, line-height 1.55, measure under 75 characters in the
  brief.
- **Code and the ticket number:** `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas,
  monospace`. Mono is used for code and for the big order number on the slip. It is not used for
  small data labels.
- **Scale** (≈1.25): 13 / 14 / 16 / 20 / 25 / 31 / 39 px. The slip's number is set very large
  (56 px desktop, 44 px phone), tabular, heavy, tight tracking: the type itself is the graphic.

No font is downloaded. Nothing new is added to `node_modules`.

## Layout

### Home, new visitor, desktop (1280x800)

```
[Skip to content]
◎ Orbit Orders   Office  Skills  Leaderboard  Profile          🔥 0   Intern ▭▭ 0 XP   ⚙
┌───────────────────────────────────────────────┬────────────────────────────┐
│ Learn to code with an AI teammate,            │ ┌╌╌ thermal-paper slip ╌╌┐ │
│ and learn to catch its mistakes.              │ │ #1                     │ │
│                                               │ │ Welcome aboard:        │ │
│ Byte writes code fast but not always right.   │ │ fix the greeting       │ │
│ You'll learn Python by fixing the real code   │ │ Bug fix, about 10 min  │ │
│ of one growing app.                           │ │ New idea: strings      │ │
│                                               │ │ ┌────────────────────┐ │ │
│ 1 Read  2 Learn  3 Fix and run  4 Merge       │ │ │ Start ticket #1    │ │ │  ← the one amber button
│                                               │ │ └────────────────────┘ │ │
│                                               │ └╌╌╌╌╌ perforation ╌╌╌╌╌╌┘ │
└───────────────────────────────────────────────┴────────────────────────────┘
#orbit-team (3 short messages, one line each)
The building
  Floor 1  Your First Week           0 of 10 merged          ▾ (open: the sprint board)
  Floor 2  Week Two: The AI Pair     opens after Floor 1     🔒
  …
  Final exam                          opens after Floor 5     🔒
Side floors (locked, each with what's inside and what opens it)
  Robotics Lab      2D arms and sensors. Opens after Floor 1, ticket 10.
  Manipulators M1–M4 A real UR5e arm in 3D. Opens after …
  Bug Bounty        Mystery bugs, no hints. Opens ticket by ticket.
Badges you can earn (3)  ·  Office leaderboard (fictional teammates, labelled)
```

### Home, new visitor, phone (390x844)

```
Office Skills Board Profile   🔥0 0XP ⚙
Learn to code with an AI teammate,
and learn to catch its mistakes.
Byte writes code fast…
┌╌ slip ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
│ #1  Welcome aboard   │
│ Bug fix, ~10 min     │
│ [ Start ticket #1 ]  │   ← first screen, no scroll
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
#orbit-team
The building (rows)
Side floors (locked rows)
Badges · leaderboard
```

### Home, returning (progressed)

The slip shows the next ticket and "Continue ticket #N". Under it, one line: streak, today's
warm-up, rank. Then today's warm-up (moved up from the bottom). The floor directory keeps the
current floor open, and its merged tickets fold into one "8 merged, show them" row. The
performance-review links stay on the floor rows. Badges, leaderboard, the human-in-the-loop
score and the app preview move into a "Your record" band at the end, two columns on desktop.
The app preview folds by default.

Target: progressed home under 3,000 px on desktop and under 5,000 px on a phone (was 6,830 and
11,232).

### Ticket page, desktop (1280x800)

```
◎ Orbit Orders  …                                                     🔥  XP  ⚙
┌ brief 380px ───────────────┐┌ editor ──────────────────────────────────────────┐
│╭╌ slip ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╮││ ✏ app/greeting.py   🔒 +1 read-only file   ↺ Reset │
││ #1  Bug fix, ~10 min     │││  1 """Greeting shown…"""                          │
││ Welcome aboard: fix the  │││  …                                                │
││ greeting                 │││                                                   │
│╰╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯││ Esc then Tab leaves the editor. Ctrl+M: Tab moves focus │
│ Your task                  │├══════════ drag handle (or ↑↓ keys) ════════════════┤
│ Edit app/greeting.py …     ││ [▶ Run tests]  ●● 0 of 2            Hints (0 of 3) │
│ Done when  ✗ …  ✗ …        ││ CI checks │ Production logs │ Lab view    ⤢ Larger │
│ The story (open, 1st visit)││ results: 45% of the column by default, 60% after a │
│ Lesson (open, 1st visit)   ││ run, 70% when the run drew in the Lab viewer.      │
│ Byte (after the first run) ││                                                     │
└────────────────────────────┘└───────────────────────────────────────────────────┘
```

- Results get a resizable split (a real `role="separator"` with arrow keys) instead of a
  260 px inner-scroll slot. The debugger and the Lab viewer use the same pane.
- Incidents: the red banner and clock go to the top of the brief. The logs become a tab of the
  results pane ("Production logs"), open until the first run. The editor keeps its height.
- Python loading: the Run button shows the real stage the worker reports (download, start,
  load the checker), with a bar and a one-line explanation, in place of a grey "Starting Python…".

### Ticket page, phone (390x844)

Unchanged structure (it tested well): Brief / Code / Checks steps, sticky Run bar, auto-switch to
Checks after a run. The slip heads the Brief. The Run bar uses the amber button. The incident
logs stay in the Brief with the Logs chip on the Code step.

Alignment: left-aligned everywhere. Nothing is centred except the slip's button.

## Principles

1. **One amber button per screen.** If two things are amber, one of them is wrong.
2. **Green is earned.** Green only means a passing check or a merged ticket.
3. **Violet is Byte.** Anything the AI says is violet, so "check the AI" has a colour.
4. **The slip is the hero.** The next ticket is a physical object; no gradient hero, no mascot.
5. **Structure carries information.** Floors are a building directory (rows), not a stack of
   identical cards. Radius follows hierarchy: the slip has a perforated edge, panels 12 px, chips
   full-round, rows none.
6. **Show the whole building, honestly.** Locked floors say what is inside and what opens them.
   Fictional teammates are labelled as fictional wherever they appear.
7. **Quality floor without fanfare:** visible focus, a skip link, 24 px minimum targets on
   phones, reduced motion respected, no sideways scroll at 390 px, both themes.

## Review against the brief and the "generic AI look" list

The first draft, reviewed honestly:

| First draft | Problem found in review | Revision |
|---|---|---|
| Ticket slip in warm cream paper `#F4EFE3` with a terracotta stamp | Cream plus terracotta is trait 1 on the generic list | Cool thermal paper `#E9EDF6` (real thermal rolls are blue-white); no stamp colour, the number itself is the mark |
| Keep the violet-to-cyan gradient hero with the 🤖 emoji | Gradient wash as decoration (trait 4); the audit said the emoji reads like a skull | Flat Night shift background; the slip is the hero image |
| Floors as six identical rounded cards with soft shadows | The SaaS card kit (trait 4) | A building directory: rows with rules, only the current floor opens into a board |
| Section eyebrows ("STARTUP HQ · ORBIT ORDERS", "CI CHECKS", "DONE WHEN") | All-caps eyebrow labels (trait 5), and they are on every section today | Sentence-case headings that say what the section is; no eyebrow above the hero |
| Buttons "Start your first day →", "Open ticket →" | The '→' tell (trait 5), and the copy names no action | "Start ticket #1", "Continue ticket #4": the action and its object, no arrow |
| Primary actions in emerald | Green is also "pass"; and white on emerald-600 is 3.65:1 | Amber with ink text for actions; green only for results |
| Mono for XP, minutes and counts | Mono for small data labels (trait 5) | Tabular figures in the body face; mono only for code and the slip's number |
| A night-black page `#0B0D12` | Tinted near-black (trait 2 / 5) | A clearly blue Night shift `#131833` |
| Skills check card under the hero | Competes with the one action (audit flaw 4) | Offered after the first merge, as a quiet row, not a button |

Then the brief itself, checked line by line:

- One main action per screen: home has one amber button; the ticket page's amber button is Run
  tests (Next ticket replaces it once merged).
- Bigger results area: resizable split, 45 / 60 / 70 % defaults, debugger and Lab viewer included.
- Cleaner, more polished, distinctive: the slip, the building directory, three colour rules.
- Story, content and features unchanged: only layout, copy fixes the audit asked for, and the
  ticket-1 "why" options (the audit's giveaway).
- Locked side floors for newcomers: yes, with preview text and the unlock condition.

## What was built differently from this plan

Recorded after the build, so the plan stays honest:

- See the final report for anything not finished. (Updated at the end of the work.)
