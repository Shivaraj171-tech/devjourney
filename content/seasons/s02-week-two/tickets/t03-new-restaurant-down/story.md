**From:** Orbit Orders alerts 🚨 (paging: you, on-call)
**Ticket:** INC-203: Checkout errors for Noodle Nook

Noodle Nook joined Orbit Orders at noon, and every customer who tries to check out from it gets an error page. Other restaurants are fine.
Maya is stuck on a train with no signal, so you're on call. Since Monday, the checkout header shows each restaurant's star rating, using Byte's new `app/ratings.py`.
The logs panel above the code has the full traceback. Read it from the **bottom up**: the last line says *what* went wrong, and the lines above it say *where*, ending in our code.
Get checkout working again: new restaurants should show "New!" instead of crashing. The clock is running, but don't panic. A careful fix beats a fast wrong one.
