# House style

For everything a learner reads: stories, chat, Byte's pitches, PR descriptions, lessons, hints, quizzes, season intros and UI copy in `lib/`. The cast and their voices are in `cast.md`. `python3 scripts/validate_content.py` runs the automatic part of this guide (the slop check, rules S1 to S5 and W1 to W4 below) on every run.

## The short version

1. Say the specific thing. A number, a name, a file, a time.
2. Write like the person whose name is on the message. Cover the name; you should still know who it is.
3. No emoji in prose. No em or en dashes. Exclamation marks are rare.
4. Feelings show in what people do, not in punctuation.
5. Don't repeat yourself across files. If the same sentence works in ten places, it belongs in the UI once, or nowhere.

## Rules

### Emoji

None in prose: stories, chat text, Byte's lines, PR descriptions, lessons, hints, quizzes, intros. An emoji standing in for a feeling (👋 🎉 😬 🚀) is the main thing that made the old copy sound machine-made.

Icons and avatars in the interface are a design decision, not a writing one, and the visual designer owns them. Season `icon:` fields are icons, not prose.

### Exclamation marks

Rare. A rough budget: one per story, and only from Sam, or inside a quote where a customer actually shouted. Maya, Rosa, Kavya and the narrator never use them. Byte uses them so rarely that they can't tell you whether it is right. A "!" inside code (`"Welcome back, {name}!"`, `3!`) is code, not tone.

### Dashes

No em dashes (—) and no en dashes (–) in prose. Use a full stop. If that feels abrupt, it is probably right. A hyphen in a compound word ("small-order fee") is fine. A minus sign in maths is fine.

### Colons

The old copy replaced every dash with a colon ("Big week: Grabby is…"). Use a colon when a list or a quote follows. Otherwise use a full stop. Byte may use "cause: fix", because that is how it talks; nobody else should sound like that.

### "Not X, but Y"

The rebuttal shape ("It's not just a bug, it's a lesson") is the strongest single tell. Once in a while it is the clearest way to say a thing. Twice in one file fails the check.

### Banned words and phrases

These fail the check anywhere in prose:

delve, dive in, seamless, leverage, unlock (as a verb in prose), elevate, journey, empower, crucial, vital, game-changer, let's, great job, great work, awesome, you've got this, here's the thing, in this lesson.

"robust" is allowed only as the technical term ("robust IK", "a robust solver").

Watch, and use at most once per file: actually, classic, quietly, simply, honestly, beautiful, lovely, famous, sneaky, superpower, "proud of you".

### Lesson structure

The lessons are good. Keep their substance and their order: a picture first, then the maths, then a worked example that runs, then the trap, then how to check an AI's version.

Do not label sections by their type. "Watch out", "AI check", "Worked example", "The maths" and "Intuition" told the reader nothing about this lesson and appeared in half the files. A heading says what the section is about:

| Old | New, for this lesson |
|---|---|
| **Watch out** | **Rows instead of columns** |
| **AI check** | **Ask Byte's matrix where x goes** |
| **Worked example** | **The box corner at (0.3, 0.2)** |
| **The maths** | **Where each arrow lands** |
| **Intuition** | **Two arrows stuck to the box** |

In short lessons, drop the label where the paragraph already warns, or write a heading that names the trap ("**Test the exact limit**"). The validator checks that a long lesson still has its five sections, a worked example that runs, and a closing section about checking an AI; it does not care what the headings say, and it warns when one heading appears in more than three lessons.

### Season intros and stock lines

Each intro says what this season is about, in its own words. "Optional: it never blocks the main story." appeared on five floors; say it once, in the UI, or say something about this floor instead.

### UI copy

State the fact. "Merged at 12:31. +125 XP." beats "PR merged!". Errors say what happened and what to do. Buttons say what they do.

## Specific beats generic

| Generic | Specific |
|---|---|
| the totals don't match | $22.40 by email, $27.99 by text |
| a restaurant | Noodle Nook (`nn-1`) |
| the robot | Grabby-6, tote 9, box #414 |
| the whole team is proud of you | Leo forwarded the email with no comment |
| customers are upset | three screenshots, two refunds |
| fast | before lunch, in two seconds, at 2 a.m. |

Never invent facts presented as real: no statistics about the real world, no claims about real companies. In-world numbers (3,112 orders in week one) are fiction and fine.

## Examples from this pass

Before (Maya, s01 t01):
> Hey, welcome to the team! 👋 Your first ticket is a small one, but customers see it straight away.

After:
> Welcome. First ticket's small, but every customer sees it the second they open the app.

Before (Byte, chat):
> You were right, my suggestion would have broken it. Noted for my next training run. 📝

After:
> You were right. Mine would have broken it. Writing that down somewhere I'll ignore.

Before (Maya, s03 t06):
> We're live! 🎉 Over 3,000 real orders in week one, and not a single one lost at the night restart.

After:
> Week one live: 3,112 orders, none lost at the 3 a.m. restart.

## The automatic check

`scripts/validate_content.py` reads every prose file under `content/` and the chat lines in `lib/game/teamChat.ts`. It skips fenced code, inline code, maths, quoted strings, Parsons and other code fields in YAML, and files under 30 words.

| Rule | Fails or warns | When |
|---|---|---|
| S1 | fail | any em or en dash in prose |
| S2 | fail | any banned phrase |
| S3 | fail | 2 or more "!" and more than 12 per 1,000 words |
| S4 | fail | 2 or more emoji and more than 15 per 1,000 words |
| S5 | fail | 2 or more "not X, but Y" rebuttals in one file |
| W1 | warn | 3 or more mid-sentence colons and more than 30 per 1,000 words |
| W2 | warn | any emoji in prose |
| W3 | warn | the same 7-word run in 3 or more files |
| W4 | warn | the same lesson heading in more than 3 lessons |

Fails stop the build like any other content error. Warnings are printed under `slop/warnings` and do not.
