# UI/UX panel review: DevJourney (Orbit Orders HQ)

**Method:** I drove the static build with Playwright at 1440×900 and 390×844 across every main screen, and ran DOM probes for overflow and focus. Screenshots are `{desk,phone}-NN-*.png` in the session scratchpad (not committed). Every claim is something I saw or can point to in code.

## 1. Five strengths to keep

1. **Byte suggestion card.** A quote, a red/green diff and three equal choices (`desk-06-byte-card`). The verdict after a wrong accept is honest and doesn't punish (`desk-06b`). This is the product's signature.
2. **The debugger.** Prev/Next, a scrubber, a plain-English caption, a "new" chip on changed variables and the line highlighted in the editor (`desk-08-debugger`).
3. **Failure messages that explain.** `cart_subtotal([450, 299]) should be 749, got 450` plus a plain sentence, with no traceback noise (`desk-07`).
4. **Tone and narrative chrome.** #orbit-team (`desk-04`), the incident banner (`desk-11`) and Maya's review (`desk-14`, the best-composed screen) give real consequence and warmth.
5. **Restraint in the celebration.** The solved modal shows an XP receipt and a rank bar with "300 XP to Trusted Intern" (`desk-09`).

## 2. The 15 most important problems (ranked by impact on a beginner's first 30 minutes)

| # | Screen | Evidence | Why it matters | Fix | Effort |
|---|---|---|---|---|---|
| 1 | Ticket (all) | `desk-05-bug-before`, `desk-03-ticket-t01-fresh`: the left column is story → Byte card → lesson nudge → **Your task / Done when**. At 900px the task box and Byte's Accept/Reject buttons are **below the fold**. | A beginner's first question is "what do I do?" The answer is the last thing in the column. | Move a pinned "Goal + Done when" block to the top of the left pane. Collapse the story to 2 lines plus "Read more". Put Byte below the goal. | S |
| 2 | Ticket s01-t01 | `desk-03`: on the very first ticket Byte offers the correct fix (`t01-welcome/byte.yaml: correct: true`) next to the story, before the learner has met the editor, Run or the lesson. | The first action a newcomer is invited to take is "Accept the AI's answer". It teaches the opposite of the pitch. | No Byte on t01. Its first appearance should be a *wrong* suggestion after the learner has made one run themselves (t02/t03). | S (content) |
| 3 | Ticket, phone | `phone-05b-bug-before-full`: the editor starts ~1,350px down, under the full story. Code lines clip at ~40 chars (`return round(sum(ratings) / len(r…`). Only one file tab plus a lone 🔒 fits. After Run, results render below the editor, off-screen (`phone-07`). | Typing Python on a phone keyboard in Monaco is not viable for a beginner, and the layout doesn't try to make it so. | Define a **phone mode** (see §3): step tabs (Brief / Code / Checks), word-wrap on, scroll to results after Run, and lean on tap-only ticket types (review, read, Byte decisions, quiz, warm-up). | M |
| 4 | Review, phone | `phone-10d-review-unsolved-full`: line 17, `return int(subtotal_cents * perc…`, **the bug itself**, is cut off at the right edge. All 28 lines are green "+". | The thing you are asked to find is invisible without sideways scrolling inside a code box. | Turn on `white-space: pre-wrap` with a hanging indent on phone review rows, or a "wrap lines" toggle. | S |
| 5 | Review | `desk-10c`: a brand-new file is a wall of green; the only instruction ("Click a line to flag it…") is 12px grey text under the code. There's no hover or cursor cue visible at rest, and the footer mentions "red – lines were removed" when there are none. | Beginners don't know lines are clickable. The core verb of the ticket type is hidden. | Add a callout above the diff: "Tap a line to flag it 🚩 (0/2 found)". Show a faint flag icon in the gutter on every row. Mute the green tint for new files. | S |
| 6 | HQ fresh | `desk-02b-hq-fresh-full`: before the first room, the newcomer sees four zero stats, a Human-in-the-loop table of `0/0`s, a locked warm-up, then **26 rooms of which 25 are locked**, plus three locked floor intros. Page: 3,800px desktop, 7,500px phone. | Empty states read as "you have nothing". A wall of padlocks reads as homework. | Progressive disclosure: hide HITL and the warm-up until they have data, show only Floor 1 (later floors as one-line "coming up" rows), and fold badges into one "next badge" row. | M |
| 7 | HQ returning | `phone-04-hq-mid`: on phone the whole first screen is the marketing hero ("Learn to code with an AI teammate…") even at 6/26 merged. The Continue button sits at y≈610. | Returning players need "Continue" plus "what's new", not the pitch. | Once the learner has merged a ticket, swap the hero for a compact "Today" card: next ticket (title, type, minutes), streak, warm-up status. | S |
| 8 | Onboarding | `desk-01`, `phone-01`: one dense modal with ~110 words plus 4 steps. The first Tab goes to the **top-bar link behind the modal** (no focus trap), and Esc does nothing. PR, merge and checks are named before they are shown. | The first 10 seconds are reading, not doing. The modal fails basic dialog keyboard expectations. | Cut it to 3 short cards or one line ("Fix real code, check the AI, ship it") plus "Start ticket #1". Trap focus and focus the CTA on open. | S |
| 9 | Ticket tabs | Up to 5 tabs at 13px on incident tickets (`desk-11`: Ticket · Learn · Hints · Quiz · Ask Byte). On phone "Ask Byte" truncates to "Ask" (`phone-11`). Tabs have `role="tab"` but no `tabpanel` or `aria-controls` and no arrow-key handling (`TicketWorkspace.tsx`). | Core and optional items (a mostly locked quiz) get equal weight. | Show the lesson as an inline collapsible "2-min lesson" at the top of the brief. Move Hints next to Run and the Quiz into the solved flow. Add proper ARIA. | M |
| 10 | Incident | `desk-11`: the editable `app/ratings.py` tab is scrolled **off the right of the tab strip**. The visible tabs are all 🔒 files. On phone the red banner and timer sit below the whole story (`phone-11`), so the urgency lands late. | "Which file do I fix?" with a clock running is stress for nothing. | Always sort editable files first, and hide read-only files behind "+4 more files". On phone, pin a compact timer chip to the ticket header. | S |
| 11 | Run feedback | `desk-07`: a failing run shows "1 of 4 checks passing" in small amber text. There's no delta between runs, and the "Done when" ticks update in a column that has scrolled away. Before the first run the panel is mostly hint text in `slate-600` (`desk-05`). | The best feedback (✅/❌ per requirement) is shown where they aren't looking. | Add a progress pill next to Run ("●●○○ 2/4, +1 since last run"). Collapse passing checks. | M |
| 12 | Solved modal | `desk-09`: two full-width primary buttons in different saturated colours (purple Quiz, green Next) compete. The hero icon is a plain purple circle (🟣). | The decision at peak delight is unclear, and the quiz (which consolidates learning) looks optional. | Make one primary ("Lock it in: 1-min quiz, +45 XP") with "Skip to next ticket" as secondary text. Replace 🟣 with a merge or rocket illustration. | S |
| 13 | Accessibility | Contrast (computed): `slate-600` on `slate-900` is **2.36:1** (CI "Tip", HITL footnotes) and `slate-500` is **3.75:1** (section labels "CI CHECKS", "Room 1", badge descriptions), both below AA 4.5:1 for small text. Focus is the browser default 1px ring (probe: `outline=auto 1px`), and only `ReviewPanel` sets `focus-visible`. | A dark UI with small grey text is hard on tired eyes and low-vision users. Keyboard users get little sign of focus. | Raise the floor to `slate-400` for text. Add a global `:focus-visible { outline: 2px solid violet-400; offset 2px }`. | S |
| 14 | HQ phone layout | Probe: phone HQ `scrollWidth` 509 vs 390 viewport. The warm-up `<pre>` inside an auto grid column pushes the page wide (`phone-15-warmup`: answer buttons clipped). The hero 🤖 also overflows by 7px. | Sideways wobble on the home screen feels broken. | Give the warm-up grid `grid-cols-1` / `minmax(0,1fr)`. | S |
| 15 | Leaderboard / Skills copy | `desk-12`: "You're **1001 XP** away from passing Byte. That's about one ticket!" (`Leaderboard.tsx:26`, a ticket is ~100 XP), and "You (you)". `desk-13`: the skill "tree" is a 26-row linear list of slugs (`mutable-shared-data`, `reading-code`). | Wrong maths and raw slugs undercut trust and polish. | Compute tickets ≈ XP/100. Show "You" once. Use human labels ("Shared lists (mutable defaults)"). | S |

**Office metaphor:** it reads in the copy but not visually. Rooms are identical cards labelled "Room N" (`desk-02b`), a second name for "#N ticket". Either commit to it (an illustrated floor plan) or drop "Room" and use a sprint board.

## 3. Proposed layouts

### Ticket page (desktop): one goal, one editor, one feedback strip

```
┌ #4 The free lemonade nobody asked for · 🐛 Bug · ~20m ·  ●●○○ 2/4 checks ┐
├──────────── BRIEF (360px) ────────────┬─────────── CODE ───────────────────┤
│ 🎯 Goal: cart total includes the last │ ✏️ app/cart.py   +3 read-only ▾     │
│    item.                              │ ┌────────────────────────────────┐ │
│ Done when  ✅ three items              │ │ 11  for i in range(len(p)-1):  │ │
│            ❌ last item is counted      │ │ ...                            │ │
│            ⬜ single item               │ └────────────────────────────────┘ │
│ ▸ Leo's story (2 lines…)  Read more   │ [ ▶ Run checks ]  Stuck? 💡 Hint    │
│ ▸ 📘 2-min lesson: loops              ├────────────────────────────────────┤
│ ┌ 🤖 Byte suggests (line 11) ───────┐ │ CHECKS  ❌ last item is counted     │
│ │ - range(len(p)-1)  + range(1,…)   │ │   should be 749, got 450 📍 L11    │
│ │ [Accept] [Reject] [Edit myself]   │ │   [🐞 Step through]   ✅ 2 passed ▸ │
│ └───────────────────────────────────┘ │ (debugger replaces this strip)      │
└───────────────────────────────────────┴────────────────────────────────────┘
Quiz → after merge, inside the solved flow. Ask Byte → a card in the brief.
```

### Phone: a stepper, not a squeezed IDE

`[1 Brief] [2 Code] [3 Checks]` as a sticky segmented control under the header. A sticky bottom bar holds **Run** and the check pill. Run auto-switches to Checks, and "Step through" switches to Code with the line highlighted and a mini caption sheet. Word-wrap is on. Reviews, reads, Byte decisions, quizzes and warm-ups are fully tap-driven and are the phone's sweet spot.

### HQ hierarchy

```
1. TODAY card   Continue: #7 Where is the discount calculated? (📖 read · ~20m)  [Start →]
                🔥 1-day streak · ☕ warm-up ready (+10 XP) · 300 XP to Trusted Intern
2. #orbit-team  (last 3 messages; what your work changed)
3. FLOOR 1 map  (current floor only; done ✅ / current 👉 / next 2 visible / rest "+3")
4. Your app     (phone mock-up, shows what you shipped)   |  Next badge: 1 more catch 🪤
── below the fold ──
Human-in-the-loop score (once Byte has appeared) · Badges · Leaderboard · Future floors (collapsed)
Pitch hero: first visit only.
```

## 4. Quick wins (≤1 hour each) vs bigger redesigns

**Quick wins**
- Fix the leaderboard "≈ one ticket" maths and "You (you)" (#15).
- Fix the phone HQ overflow in the warm-up grid (#14).
- Global `:focus-visible` ring, and raise small grey text to `slate-400` (#13).
- Focus trap and initial focus in Onboarding (#8, keyboard part).
- Sort editable files first in the tab strip (#10).
- Word-wrap review diff rows on narrow screens (#4).
- A "Tap a line to flag it (0/2)" callout above the review diff (#5).
- One primary CTA in the solved modal, and a better icon (#12).
- Hide the "Ctrl/⌘ + Enter" hint on touch, and scroll to results after Run on phone (#3, partial).
- Move "Your task / Done when" above the story (#1, first pass).
- Remove the correct Byte suggestion from s01-t01 (#2).

**Bigger redesigns:** the ticket-page restructure (#1, #9, #11, M); phone stepper mode (#3, M–L); HQ progressive disclosure plus a Today card (#6, #7, M); committing to the office metaphor with an illustrated floor plan (L); a grouped skill map (S–M).
