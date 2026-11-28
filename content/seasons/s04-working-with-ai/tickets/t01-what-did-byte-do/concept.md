**Verifying AI claims**

An AI assistant can write a function in seconds and explain it just as fast. The explanation always *sounds* sure of itself, but it is a description of the code, not the code. Sometimes it describes what you asked for instead of what it actually wrote.

Think of a friend giving you directions with total confidence: helpful, but you still glance at the street signs. The code is the street sign. Check each claim against the real lines, and when in doubt, run a small example.

```python
def is_late(minutes):
    return minutes > 45  # claim: "45 minutes or more is late"

print(is_late(50))  # True
print(is_late(45))  # False
```

The claim says 45 is late, but `>` means *more than* 45, so the example at exactly 45 disproves it.

Confidence is not evidence. "100% tested" means nothing until you see the tests, and edges like "exactly 45" are where descriptions and code most often disagree.
