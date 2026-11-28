**From:** Orbit Orders alerts (paging: you, on-call)
**Ticket:** INC-203: Checkout errors for Noodle Nook

INC-203 P1. Checkout error page for every customer at Noodle Nook.
Noodle Nook joined at 12:00. Other restaurants OK.
Change since Monday: checkout header shows the star rating, from `app/ratings.py` (author: Byte).
On-call: you. Maya: on a train, no signal.
Full traceback in the logs panel above the code. Read it **bottom up**: the last line says *what* went wrong, the lines above it say *where*, ending in our code.
Expected: checkout works again, and new restaurants show "New!" instead of crashing. The clock is running. A careful fix beats a fast wrong one.
