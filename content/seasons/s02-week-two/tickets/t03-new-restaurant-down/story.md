**From:** Orbit Orders alerts (paging: you, on-call)
**Ticket:** INC-203: Checkout errors for Noodle Nook

INC-203 P1. Checkout error page for every customer at Noodle Nook.
Noodle Nook (nn-114) launched 12:01. Other restaurants OK.
Changed Monday. Checkout header shows the star rating, from `app/ratings.py` (author Byte).
On call, you. Maya is on a train with no signal.
Full traceback in the logs panel above the code. Read it **bottom up**. The last line says *what* went wrong. The lines above it say *where*, ending in our code.
Goal: checkout works again, and new restaurants show "New!" instead of crashing. The clock is running. A careful fix beats a fast wrong one.
