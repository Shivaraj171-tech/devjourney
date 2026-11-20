# Fun roadmap: making Orbit Orders feel like a game, not a syllabus

**Method:** played the static build (HQ, ticket workspace, review/read/incident tickets, leaderboard) at 1440px and 390px with seeded progress, and read the components that create the moment-to-moment feel (`HQ.tsx`, `TicketWorkspace.tsx`, `SolvedModal.tsx`, `ByteSuggestion.tsx`, `AskByte.tsx`, `HumanInTheLoop.tsx`, `lib/game/*`). Builds on `competitors.md` and `playtest-beginner.md`; doesn't repeat their content fixes.

## 1. Honest audit

**What's already fun**
- **Byte is the best mechanic in the game.** Accept / Reject / Edit on a suggestion that *sounds* sure is a real decision with a delayed reveal ("you only find out by running it"). That's the Zachtronics/HRM feeling: you're the one who's right. Ask Byte's prompt cards are a good second verb.
- **The stories.** Every ticket has a person and a customer symptom, and callbacks (Byte's `>` bug coming back) reward memory.
- **Never punishing.** Unlimited runs, capped hint cost, forgiving streak, timers that only gate a bonus. Keep this.
- **The phone mock-up lighting up** is a genuine "I built this" payoff.

**What isn't fun yet**
- **Moment-to-moment feel:** the core loop is *edit → Run → read a list*. A passing run is a list turning green and then a modal. A failing run has no texture at all. There's no sense of "almost": 4/5 checks green feels the same as 0/5.
- **Feedback juice:** the solve modal is the only celebration, and it's a static XP receipt. Your XP total and rank bar change somewhere else (the top bar), invisibly. Crossing 700 XP made you a Trusted Intern and **nothing happened**: the biggest milestone of the first week is silent.
- **Pacing:** 26 rooms in a row with the same rhythm. Incidents are the only change of tempo, and their timer is a small number in a panel. Nothing marks the end of a season except the next floor quietly unlocking.
- **Rewards:** XP is the only currency and you can't spend it. Badges are a static grid at the bottom of the HQ, earned silently (you discover them later, if ever).
- **Story between tickets:** teammates exist only inside ticket text. Close a ticket and the office goes quiet: Leo never says the support queue got better, Byte never reacts to being caught. The HQ hero says the same thing on day 1 and day 20.
- **Social:** a leaderboard of fictional colleagues whose numbers barely move (only Sam's grows). No reason to talk about your progress with anyone.
- **Surprise:** zero. Same modal, same XP, same rooms. No variable reward, no "huh, what's that?".
- **Mastery:** the human-in-the-loop score is the right idea, but it's a table of counters. There's no reward for *playing well* (first-try passes, zero hints, clean reviews) beyond +25 XP once, and no moment where you see how much you've grown.

## 2. Prioritised improvements

Effort: S (< 1 day), M (a few days), L (1–2+ weeks). "Server" = needs a backend.

1. **Merge payoff: XP count-up, rank bar fill, promotion moment.** In the solve modal, count your total XP up, fill the rank bar, and when the rank changes, give it a full beat ("🌿 You're now a Trusted Intern!" + a line from Maya). *Why:* the reward has to be visible at the moment of effort (immediate feedback is what makes a variable schedule feel earned); a promotion is the story's biggest beat and currently silent. **S, no server.** ✅ *Built.*
2. **#orbit-team chat on the HQ.** A Slack-style feed where teammates react to what you just shipped (Leo for bugs, Priya for features, Maya for reviews), Byte reacts to being caught or trusted, Sam needles you about the leaderboard, Priya notices your streak, Maya names the next ticket. A pure function of progress. *Why:* social proof and *consequence*: your fix mattered to someone. Turns the HQ from a menu into a place. **S–M, no server.** ✅ *Built.*
3. **Rooms that change since your last visit animate.** A MERGED stamp on newly merged rooms and a door-glow + "🔓 New" on newly unlocked ones, once. *Why:* the map is the progress model; changes you can see are changes you feel ("look what I did yesterday"). **S, no server.** ✅ *Built* (plus a flickering streak flame in the top bar).
4. **End-of-season performance review from Maya.** A page per floor: rating (always encouraging), tickets by type, concepts learned, you-vs-Byte stats, strengths, one thing to try next, a "copy summary" button. *Why:* a season needs an ending (peak-end rule); reflection consolidates learning; a shareable artefact is the cheapest social loop there is. **M, no server.** ✅ *Built.*
5. **Flow combo for clean merges.** Count consecutive merges that were right first time with no hints ("🎯 Flow ×2 → 🔥 On a roll ×3 → 🌊 Deep flow ×5"), shown in the modal and celebrated in the chat. Display only, never taken away as a punishment. *Why:* rewards mastery, not grinding, and gives experts a self-set challenge. **S, no server.** ✅ *Built* (display only; a bonus XP multiplier is a balancing decision for later).
6. **"Almost there" run feedback.** On every run, animate checks flipping one by one, show "3/5 → 4/5 ✨ progress!" when the count improves, and a gentle shake only on the check that newly failed. *Why:* progress you can perceive between attempts keeps beginners trying instead of quitting at red. **M, no server** (touches `TestResults.tsx`).
7. **Badge toasts + "next badge" nudges.** Toast when a badge is earned; on the HQ, show the closest unearned badge ("1 more catch for 🪤 Bug Catcher"). *Why:* goal gradient effect; badges are currently invisible when earned. **S, no server.**
8. **Incident "boss" mode.** Red-alert framing for incidents: pulsing banner, Slack channel filling with fake customer complaints as the timer runs, a dramatic "ALL CLEAR" when fixed, and Byte offering a panicky (wrong) hotfix. *Why:* tempo change and stakes; it's the climax of each floor. **M, no server** (content for Byte hotfixes, so later).
9. **Byte's "confidence" meter.** Byte states a confidence % on each suggestion that has nothing to do with correctness; the review shows "Byte was 97% sure. It was wrong." *Why:* makes the core lesson (AI sounds sure regardless) visceral and memorable. **S content + S UI, no server.**
10. **Daily "ops" variety / random event.** Occasionally the HQ opens with a surprise: a customer thank-you note, Byte's "bug of the day" to spot in 30 seconds, a lunch-order easter egg. *Why:* variable rewards, a reason to open the app daily beyond the streak. **M, no server.**
11. **Cosmetic desk.** Spend XP (it never decreases rank) on desk items, Byte skins, a plant that grows with your streak. *Why:* currency you can spend gives XP meaning; low-stakes self-expression. **M, no server.**
12. **Sam as a real rival arc.** Sam's XP reacts to yours (stays just ahead / just behind), and occasionally posts a ticket he "solved" for you to review, with a bug in it. *Why:* a rival with a story is stronger than a number on a board. **M, no server.**
13. **Sound design (opt-in).** A soft mechanical-keyboard "merge" chime and a CI whoosh, off by default, toggle in the top bar. *Why:* audio is half of "juice", but must never surprise people in a library. **S, no server.**
14. **Share card image.** Render the performance review as a PNG (canvas) for social posts. *Why:* growth loop; proof of skill. **S–M, no server.**
15. **Real multiplayer: review a friend's PR, weekly bug-hunt race.** *Why:* real social stakes beat simulated ones, and peer review is the most-loved feature in this space (Exercism). **L, needs server.**

## 3. What was built in this pass (1–5)

- `components/MergeJuice.tsx` inside `SolvedModal`: count-up, rank bar (`role="progressbar"`), promotion banner (`role="status"`), flow chip. Logic in `lib/game/juice.ts` (`promotion`, `rankProgress`, `countUpValue`, `cleanSolve`, `flowStreak`, `flowLabel`).
- `components/TeamChat.tsx` on the HQ; logic in `lib/game/teamChat.ts` (`teamChat(progress-derived input) → messages`, deterministic).
- Room flourishes on the HQ: `lib/game/rooms.ts` (`roomChanges`) + `lib/useOfficeSeen.ts` (last-seen snapshot in `localStorage`, per browser; storage failure = nothing animates).
- `/review/[season]/`: `components/PerformanceReview.tsx`, logic `performanceReview` in `lib/game/juice.ts`. Linked from the floor header and the chat once a floor is done.
- All animation is CSS, disabled under `prefers-reduced-motion` (the count-up jumps straight to the final value). Nothing changes XP, so existing balance and tests are untouched.

**Next recommended:** #6 ("almost there" runs) and #7 (badge toasts) are the highest fun-per-effort left; #8 (incident boss mode) is the best story beat.
