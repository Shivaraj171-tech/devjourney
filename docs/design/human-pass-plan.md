# Human pass: plan

Designer: Tomás (visual design), 2026-11-28. Input: the anti-slop audit (`slop-audit.md`: 337 emoji
characters, 101 distinct, in UI source; 27 middle-dot strings on the progressed home; 35 `uppercase`
and 31 `tracking-wide*` classes; 34 gradient uses; identical card grids; an emoji-confetti modal; a
made-up "5 online" dot). Process: the `frontend-design` skill. A first draft, a review against the
generic-AI list, then the revised plan that gets built.

## What stays

The thermal-paper order slip, Order-up amber as the only primary action, CI green only for a passing
check, Byte violet for whatever the AI says, and the Night shift / Daylight themes. The slip stays the
one loud object. Everything below makes the rest of the screen quieter and more specific to Orbit
Orders.

## First draft

1. **Icons:** draw about 40 icons, one per emoji, so nothing changes in the layout. Each heading and
   button keeps a leading icon (🏆 Office leaderboard becomes a drawn trophy; 📣 Share becomes a drawn
   megaphone).
2. **Avatars:** draw a face for each teammate.
3. **Merge moment:** keep the modal, replace the confetti with a drawn burst of sparkles and the
   rocket with a drawn rocket. Keep "PR merged!".
4. **Meta strings:** swap `·` for a slash or a vertical bar.
5. **Eyebrows:** keep them, but in sentence case.
6. **Cards:** keep the grids and add a different accent colour per card.

## Review of the first draft against the generic-AI list

| First draft | What is wrong with it | Revision |
|---|---|---|
| One drawn icon for every emoji, in the same slots | That swaps one stock set for another. An icon in front of every heading and button is the icon-tile kit (frontend-design trait 4; Hallmark gate 3). The emoji were decoration, so drawing them makes the decoration look official | **Icons only where they carry information a reader uses at a glance:** ticket type, check status, lock, merged, streak, settings, Byte, the pin on the line where Python stopped. Headings, buttons and badges in running text lose their emoji and get nothing in their place. A heading says what the section is |
| Drawn trophy, megaphone, rocket, sparkles | Generic gamification objects. They fit any app (the swap test) | **Objects from this kitchen and this delivery company:** an order ticket, a receipt spike, a tasting spoon, a ladle, a pager, a scooter, a burner flame, a wrench, a padlock, a fly swatter, a jar |
| Drawn faces for the cast | A face on a fictional teammate makes them look like real staff, and the audit said to label fiction plainly | **Initials in a name-tag box**, like a staff badge or a kitchen rota. Byte gets its own mark (below), because Byte is not a person |
| Drawn sparkles and a rocket in the modal | The celebration is still a celebration; Hallmark gate 16 (a toast for an effect the user already sees) | **The ticket is spiked.** The modal shows the order slip itself. It drops onto the receipt spike, a "MERGED" rubber stamp lands with the time, and the XP is printed on the slip as receipt lines with a total. No confetti, no exclamation marks. With reduced motion the slip is simply already on the spike |
| `·` becomes `/` or `\|` | Same template, different glyph | Write the meta as **a short sentence, a comma list, or a second line**. "6 tickets. Opens after Floor 2." "Maya, tech lead, to Alex" becomes a letter heading |
| Sentence-case eyebrows | Still an eyebrow (Impeccable craft-floor: a ban, not a default) | **Delete eyebrows.** Labels that carry a fact stay, one step smaller, sentence case, no tracking |
| Accent colour per card | More colour, same kit | **Vary by importance, not by colour.** The open bounty is a pinned "wanted" slip; locked bounties are a plain list. The performance review becomes a letter from Maya with the numbers in sentences. The certificate becomes a printed receipt with a stamp. "Your record" is no longer three equal columns |

## The icon language (revised, built)

- **One set, drawn in the repo** (`components/icons/`), no library: 24 × 24 viewBox, one 1.6 px
  stroke, round caps and joins, `currentColor`, no fills except small ink dots. Lines are drawn by hand
  as paths with a slight wobble (a corner is a little off square, a circle is not quite closed), so
  they read as marker on a ticket rather than vector geometry. The same hand as the slip's dashed tear
  line.
- **Objects from the kitchen-and-delivery world**, each standing for one idea and used for that idea
  everywhere:

  | Idea | Object |
  |---|---|
  | Bug fix | a beetle (the kitchen kind) |
  | Feature | a ladle (a new dish going out) |
  | Incident | a pager |
  | Code review | a tasting spoon (taste it before it goes out) |
  | Read the code | a recipe card |
  | Merged / done | a receipt spike with a slip on it |
  | Passing check / failing check / crash | a tick / a cross / a burnt pan |
  | Locked / opened | a padlock, shut / open |
  | Where Python stopped | a pin |
  | Streak | a burner flame |
  | Warm-up | a mug |
  | Hint | a folded note from the chef |
  | Lesson | an open cookbook |
  | Step through (debugger) | a magnifier |
  | Settings | a wrench |
  | Byte | a small ticket printer with two eyes (Byte prints code fast) |
  | Delivery, the app | a scooter |
  | Timer (incident clock) | a kitchen timer |
  | Bug Bounty | a "wanted" pin (the bounty board) |
  | Robotics floors | a robot gripper |
  | Exam and certificate | a rubber stamp |

- **Ranks and badges** map to icon ids in `lib/game/rules.ts` (`icon: "apron"` and so on) instead of
  emoji strings; names and descriptions are unchanged. The writer owns the names.
- **Accessibility:** every icon is `aria-hidden` next to visible text, or carries a `title`/label when
  it stands alone (the settings wrench, check status in a list). Icons inherit text colour, so they pass
  contrast where the text does.

## What replaces each tell

| Tell (audit) | Replacement |
|---|---|
| Emoji as icons (337 in source) | The drawn set above where an icon carries information; nothing where it was decoration. Emoji the learner types and emoji inside content and chat text are the writer's, and stay |
| `A · B · C` meta strings (27 on the progressed home) | Sentences, commas, or a second line. Floor rows read "Floor 2, Week Two" with "6 tickets. Opens after Floor 1." under the name |
| Tracked caps eyebrows and labels (35 + 31 classes) | Deleted, or sentence case one step smaller, no letter-spacing. The single deliberate exception is the rubber stamp's word MERGED, because a stamp is set in capitals |
| Gradient washes (XP bar violet to cyan, certificate, review, skills check, HITL, promo shine) | Solid surfaces. The XP bar is solid amber on a dark track. The certificate is thermal paper with a stamp. The slip's perforation mask stays |
| Identical card grids | Bounties: the open ones as pinned slips, the locked ones as a list. Review: a letter. Certificate: a receipt. Record: leaderboard wide, badges as a list beside it, app preview as a fold row |
| Emoji-confetti "PR merged!" modal | The spiked ticket (below) |
| "5 online" presence dot in #orbit-team | Removed. The header says what the channel is ("Team chat, fictional teammates"), nothing about presence |
| Lock hero (64 px 🔒) | The locked slip itself, clipped to the rail, with the reason printed on it |
| Medals 🥇🥈🥉 | Plain place numbers, the first three set heavier |

## How the merge moment feels

Quiet and physical, like the end of a ticket at the pass. A dimmed screen; in the middle, the same
thermal slip the learner opened on the home screen, with its big number. It slides down a few pixels
onto a receipt spike (250 ms, ease-out, no overshoot). A green "MERGED" stamp with the time (for example
"MERGED 12:31") presses onto it once: it starts slightly larger and lighter and settles, 200 ms. Under a
dashed tear line, the XP prints as receipt lines: ticket, first-run bonus, hints, total. The rank bar
and any promotion are one line each on the slip. Then the actions under the slip: the quiz, which is the one next step, so it is the amber button (it
was violet, and violet means Byte), and "Next ticket" as a plain link. No confetti, no rocket, no exclamation marks. With `prefers-reduced-motion` the slip is
already on the spike and the stamp is already down.

## Principles for this pass

1. An icon earns its place by carrying a fact. If deleting it loses nothing, delete it.
2. One hand: same stroke, same wobble, same 24 px grid, everywhere.
3. Nouns from the place: kitchen, pass, rail, spike, rota, scooter. Never trophy, rocket, sparkle.
4. Meta is written, not punctuated.
5. Importance shows in size and position, not in a new accent colour.
6. Motion only where the learner caused something (the merge), and never when reduced motion is on.
