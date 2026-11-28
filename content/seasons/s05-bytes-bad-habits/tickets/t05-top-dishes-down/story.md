**From:** Orbit Orders alerts (paging: you, on-call)
**Ticket:** INC-505: The home screen is down for everyone

INC-505 P1. Home screen error page for every customer.
Started 12:00, when Byte's "Top today" banner went live.
Byte has posted a diagnosis in the team chat (last line of the logs): a count must be text, so wrap the loop in `try/except ValueError` and skip the bad rows. Byte sounds very sure.
Before you follow it, read the traceback yourself, bottom up. What does the error message say, on which line, and what do the logged counts look like?
Expected: `top_dishes` in `app/top_dishes.py` returns what its docstring promises, `(dish, count)` pairs in the right order, and the banner comes back.
