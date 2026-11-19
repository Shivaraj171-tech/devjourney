Start with the docstrings: each function has one right under its `def` line that says what it's for. Then read the function bodies from top to bottom.
---
Trace a real example by hand. For `discount_amount(1000, "WELCOME10")`, which line runs first, and does the function ever get as far as calling `discount_percent`?
---
`discount_amount` returns 0 early for subtotals under `MIN_SUBTOTAL_FOR_PROMO` (1500). Otherwise it looks up the percent with `discount_percent`, which uppercases the code and uses `.get(..., 0)` so unknown codes give 0.
