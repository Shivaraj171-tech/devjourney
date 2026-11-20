# Playtest 2: a complete beginner plays the real app

**Persona:** 25, has never coded, has used ChatGPT, curious but easily discouraged.
**Method:** Production build played in Playwright at 1366×860 and 390×844 (isMobile, hasTouch). I played the skills check and s01-t01 to t06 for real (brief, lesson, Byte calls including a beginner's wrong ones, runs, Step through, hints, quizzes) plus the daily warm-up. Then I seeded progress to try s02-t01 (review), s02-t03 (incident), s02-t04 (Parsons), s01-t09 (break-it), s05-t01, the final exam and the certificate. Screenshots are in `scratchpad/playtest2/`, and I name them below. **Definitely** means I saw it on screen or it's quoted from a file. **Maybe** means it's a judgement call.

## Verdict

1. This is a much better first hour than playtest 1 described. The lessons now teach things before they're used, jargon is defined, and the run → read failure → step through loop is excellent.
2. The biggest new risk is the Byte decision. On tickets 1 and 2 the beginner's very first action is to judge a trap suggestion before reading the lesson, and both suggestions are wrong.
3. After that, tickets 3–6 swing the other way. Byte is right every time, so you can click Accept → Run → merge without typing a line of code.
4. The day-1 skills check makes a beginner guess 12 times at code they've never seen, then shows a bare "4/12".
5. Several small UI problems hide the exact detail you need: clipped diff lines, clipped Parsons lines, short incident logs, and a badge toast covering feedback.
6. On a phone the game is playable, and the Brief/Code/Checks tabs work well. The debugger is the weak spot.

## What improved since playtest 1 (all definitely)

- Lessons now teach before use: t01 defines *variable*/*function*/`def`/`return`; t04 teaches lists before the loop; t05 explains `pass`/`# TODO`; t07 `//` and `.upper()`; t08 `else:`; t09 imports; t06 docstring; s03-t02 `.items()`. s03-t03 hint 1 lists the four broken versions in plain words, and s03-t01's starter already has `item_count`.
- Onboarding explains merging and PRs ("developers call this 'merging a pull request', or PR"). s02-t01 story defines PR.
- Every CI panel now says how to use `print` ("Whatever it prints shows up under each check as '# printed output'", 07-t01-open.png).
- The incident clock is framed as a bonus ("14:57 left for the ⚡ +50 XP speed bonus", 81a).
- The review tool now shows removed lines (`removed-line` in ReviewPanel.tsx).
- Python was ready in about 2.3 s.

Still there: Onboarding.tsx:10 "Never two at once."

## The first 30 minutes

| min | what happens | friction |
|---|---|---|
| 0–1 | "You're hired!" modal, then "Let's go" (01) | None. Clear and warm. The chat says "say hi to new dev, our newest developer!" (02), which reads like an unfilled name (maybe). |
| 1–8 | Skills check offer, then 12 questions with 4 choices each and no "not sure" option (04). Result is "Baseline 4/12" plus "answers stay hidden" (05). | **High.** Every question is a guess, there's no feedback, and the bare score feels like failing. |
| 8–17 | Ticket 1. Byte's card comes right after "Your task", ahead of the collapsed story and lesson (07). I accepted with the tempting reason: it was a trap, and I got "You accepted Byte's code without checking" (12). The failure showed the missing comma; Step through was lovely (13). Typed the comma, merged, did the quiz. | **High** at minute 10. The quiz's Q3 is all `assert isinstance(...)` (17). |
| 17–26 | Ticket 2. Byte is wrong again: the "tidy-up" drops `:.2f`. I accepted, the run showed `$12.5` vs `$12.50`, I fixed it, merged. | Medium. That's 2 for 2 traps, and the beginner now distrusts everything. |
| 26–33 | Ticket 3. Burned, I rejected Byte, but it was right (30d). Used 2 hints (−40 XP), merged. | Low. Kind copy: "No XP lost: being careful is never wrong." |

Ticket 3 is reached at about 30 minutes. HQ then shows the human-in-the-loop card: "Caught 0 of 2 of Byte's bugs · 25% good calls" (73).

## Top 12 issues, ranked by how likely they make a beginner quit

**1. The first decision of the game is a trap, made before the lesson. (Definitely.)**
On s01-t01 the left column order is Task → Byte card → story (clamped) → lesson (collapsed) (07). The card says "Decide before you see any evidence". Both t01 and t02 `byte.yaml` have `correct: false`. Within 3 minutes the learner is told they "accepted Byte's code without checking" (12).
*Fix:* On t01–t02, show the Byte card only after the lesson has been opened or after the first test run. Or put story + lesson above it. Add an encouraging first line: "Most new devs miss this one; that's why we start here." **S/M**

**2. The day-1 skills check is 12 forced guesses. (Definitely.)**
There's no "I don't know" choice (04). The intro says "No hints, no running the code, one answer each". The result screen is only "Baseline 4/12" (05).
*Fix:* Add "Not sure yet" (scored as wrong). Add one line of context on the result ("Most people starting out get 2–5; you'll retake it"). Or offer the check after ticket 1. **S**

**3. Byte does the work on t03–t06. (Definitely.)**
All four `byte.yaml` files have `correct: true` and contain the whole fix. On t04 I clicked Accept → Run and it merged with zero typing (40d). On the t05 *feature* ticket, Byte's diff fills in both functions before the learner writes anything (50a). A beginner can finish the "first week" having typed almost no code, then hit a wall at t08–t10, where Byte is wrong again.
*Fix:* Leave one small step for the learner (like s05-t01 hint 3's "your step"), or show Byte only after the learner's first failed run. **M**

**4. The human-in-the-loop score punishes the tutorial traps. (Definitely.)**
HQ shows "Caught 0 of 2 of Byte's bugs … 25% good calls" after six tickets (73). The two "misses" are the designed t01/t02 traps.
*Fix:* Don't count t01–t02, or hide the card until about 5 decisions. **S**

**5. Quizzes use `assert` from ticket 1, but it's taught in Season 3. (Definitely.)**
`assert` appears in the questions.yaml of t01 (3×), t02 (3×), t04, t05, t06 and t10 (4× each). It's taught only in s03-t03 concept.md ("assert is finally taught"). t01 Q3 also uses `isinstance` and `.startswith` (17).
*Fix:* Add one line to t01 concept.md: "`assert x` means 'check that x is true, or fail'". Or reword the choices in plain English. **S**

**6. The story is clamped below the Byte card. (Definitely.)**
Playtest 1's favourite feature now shows two lines ("From: Maya / Ticket: …") and then "Read more ▼" (80b, m12), and on code tickets it sits under the Byte card (07).
*Fix:* Expand the story on the first visit to each ticket, and put it above Byte. **S**

**7. The debugger on a phone. (Definitely.)**
After Step through, the panel sits under about 600 px of empty editor. The caption says "highlighted in the editor", but the highlighted line is scrolled off-screen (m08, m09).
*Fix:* On phones, size the editor to its content, or show the current line inside the debugger card. **M**

**8. Byte's diff lines are clipped. (Definitely.)**
`return f"Welcome back to Orbit Orders {n` (07), `if subtotal_cents >= FREE_DELIVERY_THRES` (30d) and `return f'Tip: please type a whole nu` (84b) are all cut off. The detail that decides the call can be in the hidden part.
*Fix:* Wrap the lines (`whitespace-pre-wrap`, as ReviewPanel already does). **S**

**9. Parsons: lines clipped and traps spoiled. (Definitely.)**
On s02-t04 the two `if` lines differ only in their second half, which is cut off (82b). The first "Check my program" (I pressed it without reordering anything) printed `SyntaxError: unexpected indent (line 1)` and both traps with full explanations.
*Fix:* Wrap the lines. Reveal a trap's explanation only after a second failed check, or behind "Why?". **S**

**10. The badge toast covers feedback. (Definitely.)**
"4 NEW BADGES!" stays on screen and covers the warm-up explanation text (72-warmup-answer2), and it's still there after the warm-up (73).
*Fix:* Auto-dismiss after about 6 s, or dock it at the top. **S**

**11. Raw backticks and a contradictory tip. (Definitely, plus a maybe.)**
The quiz prompt shows literal backticks: "Byte autocompletes \`return "Welcome back…"\`" (17). The t06 crash note shows "Check it exists first (with \`in\` or \`.get()\`)" (60b). *Maybe:* that note recommends `.get()`, but t06 quiz Q3 calls `menu.get(name)` the trap ("a removed item becomes None").
*Fix:* Render inline code in quiz prompts and error notes. Drop `.get()` from the KeyError tip. **S**

**12. Incident logs hide the key line. (Definitely on desktop, maybe on phone.)**
The story says read the traceback "from the bottom up". The desktop log box shows about 4 lines, ending at "Traceback (most recent call last):", so `ZeroDivisionError` needs an inner scroll (81a). On a phone the logs live in the Brief tab and aren't visible from Code (m14).
*Fix:* Scroll the log box to the end of the traceback on open, or make it taller. On phones, add a "Logs" chip in the Code tab. **S**

**Also noted (maybe):** s02-t03 Byte's suggestion uses `try/except`, taught only in s05-t01. The certificate says "Human in the loop: verified" next to "Final 3/12" (86b).

## Phone verdict

It's good enough to learn on, but it's not yet comfortable.
- **Works well:** onboarding fits (m01), the 1·Brief / 2·Code / 3·Checks tabs are clear (m03), and there's no horizontal scroll (scrollWidth 390). The run bar stays pinned, test messages wrap and read well (m07), and review lines wrap and are easy to tap (m13). Typing in Monaco worked in emulation (not checked on a real phone keyboard).
- **Weak:** debugger and code can't be seen together (m08/m09), code wraps heavily (m14), Byte diffs are clipped (m03), and "1000 XP" touches the screen edge (m12).

## 5 things that delighted

1. **Failure messages a beginner can act on,** like "format_price(1250) should be '$12.50', got '$12.5'", pinned to the line (60b), plus coaching: "So close: one check to go."
2. **Step through.** It shows variables, with "new"/"changed" tags and "i is now 1", and ends on "↩ returns 1700" (40b). The off-by-one becomes visible.
3. **Break Byte's code.** Each miss gets "Right for that input. What total can't be split evenly?" until "You broke it!". The pitch in one widget.
4. **The team reacts to my work.** Leo: "A customer literally wrote 'it works now?!' after 'Order again? KeyError.' went out. That was you." (70). Kind recovery copy too: "No XP lost: being careful is never wrong."
5. **The review ticket.** It shows "0/2 problems found" up front, and the verdict explains each bug with a real number ("a $300.00 tip on a $20.00 order!").
