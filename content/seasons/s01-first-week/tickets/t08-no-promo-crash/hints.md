The error mentions `'NoneType'` and `upper`. Which line in `app/promo.py` calls `.upper()`, and what is `code` when the customer didn't type anything?
---
`None` is Python's "no value here". It isn't a string, so it has no `.upper()`. Check for it *before* using the code, with `if code is None:`.
---
At the top of `discount_percent`, add `if code is None:` with `return 0` indented underneath. Leave the existing `return PROMO_CODES.get(...)` line below it.
