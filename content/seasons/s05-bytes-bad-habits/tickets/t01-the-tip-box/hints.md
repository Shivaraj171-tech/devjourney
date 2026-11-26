Run the tests and read the two kinds of failure: a word like "ten" shows "Tip: $0.00" instead of the friendly message, and a missing subtotal (our own bug) is hidden too. Which single line in the `try` can fail because of what the customer typed?
---
Only `int(text)` fails because of the customer, and it raises `ValueError`. Catch just that error, and return the docstring's message from the `except` block, with what they typed in it. Move the tip line *out* of the `try`, so a bug in it can't be caught by accident.
---
Shape: only the `int(text)` line stays inside the `try`. The `except` catches `ValueError` alone and returns the docstring's friendly message, word for word, with what the customer typed in it. The line that formats the tip moves below the whole `try`/`except`, so a bug in it can't be caught by accident.
