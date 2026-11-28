**Reading unfamiliar code**

Most of a developer's day is spent reading code someone else (or an AI) wrote. Think of a recipe in a new cookbook: you check what dish it makes, what goes in, and which step does the cooking.

A simple 3-step strategy:

1. **Start from the function name and docstring** (the text in triple quotes under `def`). They tell you what the code *claims* to do.
2. **Follow the inputs.** For each parameter (the names in the `def` brackets), see where it's used.
3. **Find where the value is computed.** Look for the `return` lines, then trace backwards.

Two new bits of Python you'll meet today. `//` divides and rounds **down** to a whole number: `7 // 2` is `3`. And `text.upper()` gives an ALL-CAPS copy of a string: `"hi".upper()` is `"HI"`.

```python
def tip(bill_cents, percent):
    """Return the tip in cents."""
    if bill_cents <= 0:
        return 0
    return bill_cents * percent // 100

print(tip(1999, 15))  # 299  (1999 * 15 is 29985, // 100 drops the rest)
```

**Every way out of the function.** An early `return` (like the `bill_cents <= 0` line) can end a function before the "main" calculation runs. Always check every way out of a function, not just the last line.

Check an AI's summary of code with these 3 steps; early returns are easy to miss.
