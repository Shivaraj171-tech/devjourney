Run the tests and read the two kinds of failure: a word like "ten" shows "Tip: $0.00" instead of the friendly message, and a missing subtotal (our own bug) is hidden too. Which single line in the `try` can fail because of what the customer typed?
---
Only `int(text)` fails because of the customer, and it raises `ValueError`. Catch just that error, and return the docstring's message from the `except` block, with what they typed in it. Move the tip line *out* of the `try`, so a bug in it can't be caught by accident.
---
Here's the shape. The message line is your step: copy the exact wording from the docstring and put `text` inside it.
```
try:
    percent = int(text)
except ValueError:
    return ...  # your step: the friendly message, with text in it
return f"Tip: {format_price(tip_amount(subtotal_cents, percent))}"
```
