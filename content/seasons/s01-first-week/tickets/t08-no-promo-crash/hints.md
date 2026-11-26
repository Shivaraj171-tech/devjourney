The error mentions `'NoneType'` and `upper`. Which line in `app/promo.py` calls `.upper()`, and what is `code` when the customer didn't type anything?
---
`None` is Python's "no value here". It isn't a string, so it has no `.upper()`. Check whether `code` is `None` *before* using it: `is None` is the way to test for it.
---
At the very top of `discount_percent`, before the line that calls `.upper()`, add an `if` that tests whether `code` is `None` and, when it is, returns 0 straight away. Leave the existing `return PROMO_CODES.get(...)` line below it.
