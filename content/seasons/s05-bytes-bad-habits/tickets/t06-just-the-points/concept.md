**Scope creep: small, reviewable changes**

*Scope* is what a change was asked to do. *Scope creep* is everything else that sneaks in: "while I was in there, I also...". AI assistants do this a lot, because adding things is cheap for them. But every extra is behaviour nobody agreed to, code nobody asked to review, and a new place for bugs.

Think of asking a mechanic to change a tyre and getting the car back with new paint and a louder horn. Maybe nice, but you never agreed to it.

```python
def points_message(points):
    return f"You earned {points} points!"  # what was asked

def points_message_plus(points, weekday):
    if weekday == "Sat":
        points = points * 2  # nobody asked for this
    return f"You earned {points} points!"
print(points_message(22), "/", points_message_plus(22, "Sat"))  # You earned 22 points! / You earned 44 points!
```

When you review, hold the request next to the diff and check every changed line against it. Anything not in the request comes out, and it gets its own ticket if someone wants it.

Extras that tests don't cover still change behaviour. A default like `weekday="Mon"` hides an extra from every test that doesn't pass a weekday.

**One question per added line.** Ask "which line of the request does this line serve?" for every line an AI adds. If there's no answer, it's scope creep.
