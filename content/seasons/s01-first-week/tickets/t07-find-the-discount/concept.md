**Reading unfamiliar code**

Most of a developer's day is spent reading code someone else wrote. You don't need to understand every line at once. Think of a recipe in a new cookbook: you check what dish it makes, what ingredients go in, and then which step actually does the cooking.

A simple 3-step strategy:

1. **Start from the function name and docstring.** They tell you what the code *claims* to do.
2. **Follow the inputs.** For each parameter, see where it's used and what happens to it along the way.
3. **Find where the value is computed.** Look for the `return` lines, then trace backwards to see what produced that value.

```python
def tip(bill_cents, percent):
    """Return the tip in cents."""
    if bill_cents <= 0:
        return 0
    return bill_cents * percent // 100

print(tip(2000, 15))  # 300
```

**Watch out:** An early `return` (like the `bill_cents <= 0` line) can end a function before the "main" calculation runs. Always check every way out of a function, not just the last line.
