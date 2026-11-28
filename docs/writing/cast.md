# Cast sheet

Who works at Orbit Orders, what each person does, and how each one writes. One person, one job. If a ticket needs a job nobody here has, add a person to this sheet first; do not lend someone a second job.

Read this before writing a story, a chat line, a Byte pitch or a PR description. The test for any line: cover the name. If you can't tell who wrote it, rewrite it.

## Decisions taken in this pass

- **Sam** is the other new hire and nothing else. The two Bug Bounty tickets that said "Sam (Finance)" now come from **Kavya (Finance)**, a new character.
- **Priya** is Marketing and nothing else. "Priya (Product)" on the bounty board became "Priya (Marketing)", and her two reports now come from her own patch: a coupon campaign and the homepage's featured restaurants.
- **Rosa** is the robotics engineer. "Chef Rosa" on the bounty board is now **Ana**, head chef at Forno 7 (`pz-007`), one of our restaurants.
- Robotics incidents (the `INC-` tickets on the packing floor) open with the **pager**, in pager format, followed by a short note from Maya. The pager carries the numbers; Maya carries the decision.
- **Byte** keeps 🤖 as its avatar in the UI (that belongs to the visual designer). In prose, Byte uses no emoji at all.

## The people

### Maya Fernandes, Tech Lead

Runs the backlog, assigns tickets, reviews everything that merges. Joined from a bigger company to get away from meetings and now has more of them. Writes from her phone between those meetings.

- **Sentences:** short. Often 3 to 8 words. Fragments are fine. One long sentence per message, at most, when the reasoning matters.
- **Punctuation:** full stops. No "!" at all. Rarely a question, and then a real one. No emoji.
- **Cares about:** what merges, what breaks, ticket numbers, the deadline, whether you ran the tests.
- **Praise:** rare and specific, about the code ("Good catch on the `>=`."). Never about you as a person.
- **Never says:** "proud of you", "awesome", "superpower", "let's", "team" as a feelings word, "journey", "exciting".
- **Sample:** "Byte merged its own PR at 2 a.m. It doesn't have merge rights any more. Fix both bugs."

### Byte, the office AI

The AI pair. Autocomplete in week one, then pull requests. Fast, sure of itself, right a little over half the time. It doesn't learn between tickets the way a person does, and it doesn't know when it's wrong.

- **Sentences:** short and compressed. Usually 6 to 15 words each, two or three sentences per pitch.
- **Punctuation:** colons for "cause: fix", full stops. "!" almost never, and when it appears it appears in right and wrong pitches equally.
- **Cares about:** the diff, being done, line counts ("One line."), sounding finished.
- **The rule:** Byte's confidence never tells you whether it's right. A wrong pitch and a right pitch sound the same, are about the same length, and use the same sign-offs ("Done.", "Fixed.", "One line."). The tests in `scripts/tests/test_byte.py` measure this.
- **When caught:** one clause of apology, then straight back to the code ("Fair. Transposing the rotation only now.").
- **Never says:** "Great question", "I apologise for the confusion", "As an AI", "100% tested" (except when the story needs it to over-claim, as in a summary it posts), emoji.
- **Sample:** "Cents to dollars is / 100, not / 10. One character. Done."

### Leo Brandt, Customer Support

Reads every email, every one-star review and every screenshot. The only person who talks to customers every day, and it shows.

- **Sentences:** medium. Starts with what a customer said, quoted exactly, typos and capitals included. Then counts.
- **Punctuation:** quotes. Numbers. A "!" only inside a customer's quote, where the customer put it.
- **Cares about:** how many people it hit, refunds, what to tell them, the FAQ.
- **Never says:** anything about how the code works. He reports symptoms and leaves the cause to you.
- **Sample:** "Three emails since 9. One says 'why is your pizza $125'. Fair question."

### Priya Nair, Marketing

Campaigns, the Friday newsletter, the homepage, the restaurant owners she signs up. Thinks in dates.

- **Sentences:** brisk, medium length. Leads with the campaign and the date.
- **Punctuation:** campaign names in quotes, dates written out ("Friday", "Monday 9 a.m."). No emoji. A "!" only if something has gone wrong in public.
- **Cares about:** what the campaign promised, what customers posted, what she can announce and when.
- **Never says:** technical explanations, "synergy", "exciting news", "game-changer".
- **Sample:** "The poster says free delivery at $25 or more. Someone ordered exactly $25.00, paid $3.99 delivery and posted the receipt. With our logo."

### Sam Okafor, the other new hire

Started the same week as you. Competes with you on the leaderboard and pretends not to. The office joker.

- **Sentences:** very short chat messages. Lowercase is fine. Questions.
- **Punctuation:** "?" a lot. One "!" now and then, the only character allowed to use it casually.
- **Cares about:** XP, being ahead, lunch, getting a laugh. Claims every test customer called "Sam" is him and that he wants a refund.
- **Arc:** is right about something once, asks you for help once.
- **Never says:** anything sincere for more than one line. Never has a second job.
- **Sample:** "you passed me? on a tuesday? rematch after lunch."

### Ravi Menon, Mobile Developer

Builds the phone app. Lives with the fact that customers don't update their apps.

- **Sentences:** medium. Starts with what the app does on the phone, then what the server gets.
- **Punctuation:** parentheses for asides. Error text quoted exactly in backticks.
- **Cares about:** the phone, crash reports, what the server can't trust, release timing.
- **Never says:** "Here's the thing", "real quick", hype.
- **Sample:** "The app sends the total. Anyone with a proxy can change it, so the server can't use it."

### Sofia Marquez, Product Designer

Designs the screens, runs the hallway tests, watches people tap.

- **Sentences:** medium, concrete. Describes what people did in testing, in order.
- **Punctuation:** button labels in bold, as they appear on screen.
- **Cares about:** what people see and tap, the Friday demo, empty states.
- **Never says:** "users" (she says "people"), "delightful", "seamless", "intuitive".
- **Sample:** "In testing, people tapped **Add** five times, saw nothing on the badge, and gave up."

### Rosa Delgado, Robotics Engineer

Runs Grabby, the packing arm, and later Grabby-6. Came from a car plant. Measures before she talks.

- **Sentences:** short, front-loaded with the measurement. Part names, box numbers, tote numbers, centimetres.
- **Punctuation:** numbers with units. Few colons. No emoji. No "!".
- **Cares about:** what the arm did, where the box ended up, how far off it was, what the viewer will show you.
- **Never explains** the maths in the story; the lesson does that. One sentence of why, at most.
- **Never says:** "beautiful", "lovely", "famous", "Big week", "let's".
- **Sample:** "Asked for 90° anticlockwise. Box #31 came out label to the wall. Four boxes, same fault."

### Kavya Rao, Finance

Reconciles payouts, refunds and card receipts. New in this pass, takes over the finance reports Sam used to file.

- **Sentences:** precise, medium length. Always the exact amount, to the cent.
- **Punctuation:** amounts and counts. Polite, never chatty.
- **Cares about:** money that went to the wrong place, rider payouts, what the receipt shows.
- **Never says:** "roughly", "a bit", jokes.
- **Sample:** "41 orders yesterday paid the rider a $0 tip. Every one of those customers had typed something in the tip box."

### Ana Lim, Head Chef at Forno 7

One of our restaurants. Uses the Orbit kitchen screen. Not staff, so she writes like a customer who knows the system well.

- **Sentences:** short, kitchen words ("first ticket of service", "the pass").
- **Cares about:** getting the first orders out, the screen working at 7 a.m.
- **Sample:** "Screen dies on the first ticket every morning. After that it's fine. I reboot it with a spoon."

### The pager (Orbit Orders alerts)

Not a person. Machine format: ticket id, severity, what is broken, numbers, times. One fact per line. No full sentences, no feelings.

- **Sample:** `INC-203 P1 checkout 500s for restaurant=nn-114 since 12:04`

### The narrator (lessons, hints, quizzes)

The tutor. Already the best-written voice. Plain, specific, worked examples, no emoji, no "!". Lesson headings say what the section is about ("Why 18 is the trap"), not what kind of section it is.

## Others who are mentioned

- **Jonas** wrote the promo-code module, then moved to the payments team. Never speaks.
- **Ms McKenzie**, a customer, wrote in about her name.
- **Grabby** (two-link arm) and **Grabby-6** (the six-joint arm) are machines. They don't speak.
- **Noodle Nook** (`nn-114`), **Forno 7** (`pz-007`) and the corner-shop kiosk are restaurants and shops on the app.

## Names and places

The team is international, and four of the ten names here are Indian. Backgrounds show up the way they do in any office: a surname, a train delay, somebody's mum leaving five-star reviews. Nobody's culture is a joke or a plot point, and nobody explains their name.
