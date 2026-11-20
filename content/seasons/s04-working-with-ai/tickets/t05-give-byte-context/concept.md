**Specs and context**

An AI assistant only knows what you tell it plus what it has seen elsewhere. Ask "write a refund report" and it fills every gap with a guess from some other codebase. Give it *context* (your real function names, the inputs, the exact output, the edge cases and one worked example) and the guesses disappear.

It's like ordering a cake: "a birthday cake" gets you *a* cake; "chocolate, for 8 people, says Happy 30th Leo, no nuts" gets you *the* cake.

A good spec says exactly what happens at the edges, so the AI and your tests agree on the answer:

```python
# Spec: "late means MORE than 45 minutes"
minutes = [50, 45, 70]
late = []
for m in minutes:
    if m > 45:
        late.append(m)
print(late)  # [50, 70]
```

**Watch out:** A vague prompt plus a confident answer is the worst mix: you get code that runs but solves a different problem. If you can't write down what "done" looks like, the AI can't either.
