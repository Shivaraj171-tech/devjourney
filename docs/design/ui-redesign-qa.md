# UI redesign: independent QA

Reviewer pass on branch `ui-redesign` (9 designer commits on top of main), 2026-11-25.
Screenshots (device scale factor 1): `/tmp/claude-0/-home-user-devjourney/2503a169-b656-5fef-9e45-499d5676841a/scratchpad/ui-qa/shots/`.
Scripts: `.../scratchpad/ui-qa/*.js` (sweep, states, kbd, claims, tap).

## Verdict: ship with notes

Every claim checked held up, apart from small gaps listed below. The sweep found four real
light-theme contrast failures, three scroll regions a keyboard cannot reach, two sub-24 px tap
targets and one broken "one amber action" case. All are fixed on this branch with small commits.
What is left is minor accessibility polish and a few layout decisions for the founder.

## Check numbers (after the fixes)

| Check | Result |
|---|---|
| `python3 scripts/validate_content.py` | 107/107 valid |
| `npm run test:unit` | 193 tests, 193 pass, 0 fail |
| `npx tsc --noEmit` | clean |
| `npx eslint .` | clean |
| Playwright e2e, `--trace off`, `E2E_PORT=4497`, build reused | 192 passed, 0 failed, 0 flaky (before the fixes: 192 passed too) |
| axe, 31 routes/states x {dark, light} x {1280x800, 390x844} = 124 page loads | 0 violations on the app. The only hits are `python3 -m http.server`'s own 404 page |
| axe, 36 interactive states (failed run, hints, Byte call and reason, solved modal, quiz, debugger, PR review flagged, teacher with data, warm-up answered) | 0 violations, except `page-has-heading-one` (best practice) on the phone Code and Checks steps, see O1 |

Before my fixes the same sweeps showed: `color-contrast` x6 on the progressed home in the light theme
(both viewports), `scrollable-region-focusable` on the solved review ticket (desktop) and on the
skills check (phone, 6 nodes), `color-contrast` on the light-theme debugger and solved modal, and
`color-contrast` 4.01:1 on a Monaco keyword under the debugger's current-line highlight.

Home page heights, 1280 wide / 390 wide: new visitor 3,139 / 5,119 px (matches the designer's
3,139 / 5,120). Six tickets merged (my seed): 3,669 / 5,972 px. Everything merged: 3,321 / 5,034 px.
The designer's "progressed 5,627 px phone" depends on their seed; mine is 5,972 px because the Bug
Bounty cards are open. Both miss the 5,000 px phone target.

## Designer claims

| Claim | Verified | Evidence |
|---|---|---|
| Editor keyboard escape, Ctrl+M, visible hint | Yes | Esc then Tab on s01-t01 moves focus to the "Resize the results pane" separator. Ctrl+M changes the hint to "Tab now moves focus. Ctrl+M to indent with Tab again." The hint is opaque, 221,225,239 on 27,33,66 in dark and ink on white in light. It shows only while the editor has focus, and not on phones. |
| "So close" never shown with 0 passing | Yes | s01-t01 starter, 0 of 2: "No checks pass yet. Start with the first one". Page text has no "So close". Unit tests cover the 0-of-1 case. |
| Resizable pane, `role=separator`, arrow keys | Yes | `aria-valuemin=20 max=72 now=40`, `aria-orientation=horizontal`, tabbable. ArrowUp x2: pane 288 to 360 px, ArrowDown x3: 252 px, drag works. Home/End are inverted compared with the value (O6). |
| Incident logs as a results tab | Yes | s02-t03: "Production logs" is a tab of the results pane. |
| Python load stages | Yes, with a wording gap | A panel reads "Getting Python ready", "Downloading Python (0 of 4 files)" to "(3 of 4)", "Loading the checks", then the button turns on at 3.8 s. The Run button itself says "Starting Python..." the whole time, so the stages are in the panel, not on the button. |
| One primary amber action per screen | Yes after a fix | Home, tickets, review, settings, teacher, certificate: one each. A solved read ticket (s01-t07) showed two ("See your answers" and "Next ticket"). Fixed (D5). |
| First-visit lesson open on tutorial tickets | Yes | `lesson-toggle aria-expanded=true` on s01-t01, `false` on s01-t03. |
| Byte reason only after a call | Yes | After "Peek now" the card shows "1. Your call" only. "2. Why?" with three reasons appears after Reject. |
| Profile in the phone nav | Yes | Phone nav: Office, Skills, Board, Profile, settings. No horizontal overflow on any of the 31 routes (scrollWidth equals clientWidth). |
| Contrast fixed | Yes after fixes | See the axe numbers. Four more light-theme failures fixed (D1, D3). |
| Skip link | Yes | First Tab shows "Skip to content" at the top, Enter moves focus to `main#main`. |
| Tap targets >= 24 px | Yes after fixes | Scanned 19 phone routes, three steps for tickets. Three targets were smaller: skills-check "Skip for now" 83x20, home "Your certificate" 125x20, profile fold 324x20. Fixed (D6). |
| Honest leaderboard | Yes | Note on the home widget and the leaderboard page. Sam's XP is `150 + 90 x days practised` (cap 3,200): 150 on day 0, 420 after three practice days. |
| Streak not started by failed run or hint | Yes | Fresh progress, failed run, hints panel opened: `activeDays` stays `[]`, header says "0 day streak". |
| Locked side floors visible to newcomers | Yes | Robotics Lab (8 tickets), Manipulators M1 to M4 (42), Bug Bounty (8) with previews and unlock conditions on the new home. |
| 3D labels inside the canvas | Mostly | UR5e (s42-t06): all labels are inside the canvas on desktop and phone. The flange area is still crowded, as admitted: the "flange (frame 6)" label sits on the axis letters and a clipped glyph. |
| Light theme via system setting and Settings | Yes | `colorScheme: light` with no stored choice gives no `data-theme` and background rgb(244,246,251). Picking Dark sets `data-theme=dark` and survives a reload. |

Light theme on the pages the designer had not swept: teacher (with two reports loaded), certificate,
performance reviews (s01, s02, s99) and skills check (intro, and the full review). All now pass axe
in both themes and look coherent. Teacher, certificate and review screenshots were read at full size.

## Keyboard-only walkthrough (1280x800, dark)

Onboarding, then ticket 1, edit, run, hints, Byte call, merge:

- Onboarding dialog: focus starts on "Let's go", Tab and Shift+Tab stay inside, Enter closes it.
- Home: Tab reaches "Start ticket #1" with a visible 2 px ring, Enter opens the ticket.
- Ticket: every control has a visible ring. Monaco's own ring is 1 px blue. Tab goes brief, lesson, Byte peek, file tabs, Reset, editor.
- Fixing the greeting with Home, Right x7, "f", then Esc, Tab, lands on the separator. The Run button is next once Python has loaded, Enter runs it.
- A passing run opens the solved modal and moves focus to its first button ("Lock it in: 1-minute quiz"). No trap.
- Byte: "Peek now", then Accept, Reject, Edit myself. After Reject the three reasons appear as `role=radio` buttons.
- No trap was found. Tab inside Monaco is meant to indent, and the hint says how to leave.

## Defects

Fixed on this branch:

| # | Severity | Defect | Fix |
|---|---|---|---|
| D1 | Serious | Light theme: Bug Bounty "100 XP" chip 3.71:1 on the progressed home (6 nodes x 2 viewports) | `text-amber-50` on the chip |
| D2 | Serious | Scroll regions with no keyboard access: PR diff on a solved review ticket, skills-check code blocks on phone (6), Markdown and warm-up code blocks | `tabIndex=0` (and a labelled region for the PR diff) |
| D3 | Moderate | Light theme: debugger "new" chip 4.15:1, solved modal "(+15 XP each)" 3.86:1. Dark: debugger line highlight under a keyword token 4.01:1 | Darker chip text, highlight alpha 0.16 to 0.10 |
| D4 | Minor | Debugger "Prev" button: accessible name did not contain its visible text | `aria-label="Prev, the previous step"` |
| D5 | Moderate | Two amber primary actions on solved read tickets | "See your answers" is outlined once the quiz is done and a next ticket exists |
| D6 | Minor | Three phone targets under 24 px | `py-1` and `min-h-6` |
| D7 | Minor | Theme picker showed the chosen option only by a faint tint | A check mark (hidden from screen readers; `aria-checked` already carried it) |

Open, for the founder or a follow-up (none block shipping):

| # | Severity | Issue |
|---|---|---|
| O1 | Low | Phone Code and Checks steps have no `h1` (the brief, with the title, is hidden). Best-practice axe rule `page-has-heading-one`. |
| O2 | Low | Focus falls to `body` after "Let's go" on onboarding, after "Peek now" (the teaser unmounts), and after a failing run (the Run button is disabled while it runs). Return focus to a sensible element. |
| O3 | Low | While Python loads, Run is `disabled`, so keyboard users skip it. `aria-disabled` would keep it in the tab order. |
| O4 | Low | Byte's reason radios are each a Tab stop. A radiogroup should use arrow keys. The Theme picker has the same pattern. |
| O5 | Medium (layout) | After a run at 1280x800 the editor shrinks to about 150 px (6 lines). With the Lab viewer the 3D canvas is 487 px wide inside an 822 px pane, leaving a blank band. Results got bigger at the editor's cost. |
| O6 | Low | Separator: Home makes the pane largest, End smallest, the opposite of the usual splitter pattern next to `aria-valuenow`. |
| O7 | Low | 3D labels near the UR5e flange are still crowded (known). |
| O8 | Cosmetic | Some buttons still end in an arrow ("Take the bounty ->", "Start next floor ... ->", "Skip to the next ticket ->"), which the plan said to drop. The light theme's warm-up card has a muddy tan tint. |
| O9 | Cosmetic | The plan says results default to 45% of the column. The build uses 40% (the "built differently" section says 40). |
| O10 | Info | A player who names themselves "Maya" or "Byte" shows twice on the board. |

## Functional regression check

The full e2e suite passes (192): backup export and import, teacher mode, warm-ups, Bug Bounty,
debugger step-through, predict, Parsons, break-it and trace formats, final exam and certificate,
all season, manipulator and robotics plays. Extra manual probes: report code, teacher import of two
students with the table and averages (axe clean, both themes), certificate with a seeded final
exam, 3D viewer after a run on desktop and phone, no page errors on any swept route.
