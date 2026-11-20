**From:** Orbit Orders alerts 🚨 (paging: you, on-call)
**Ticket:** INC-505: The home screen is down for everyone

At noon Byte's "Top today" banner went live, and every customer who opens the app now gets an error page.
Byte has already posted its diagnosis in the team chat (last line of the logs): a count must be text, so wrap the loop in `try/except ValueError` and skip the bad rows. It sounds very sure. 🤖
Before you follow it, read the traceback yourself, bottom up: what does the error message actually say, on which line, and what do the logged counts look like?
Fix `top_dishes` in `app/top_dishes.py` so it returns what its docstring promises, `(dish, count)` pairs in the right order, and the banner comes back.
