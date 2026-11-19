**From:** Leo (Customer Support)
**Ticket:** BUG-302: "Order not found" after the night restart

Good morning! ☕ Our first beta testers ordered late last night, and this morning every one of them sees **Order not found** on the *Track my order* screen.
Maya says the server restarts at 3 a.m. for updates, and `app/storage.py` (Byte's work) saves all open orders as JSON first and loads them back afterwards.
The orders are clearly still in the saved file, I can see Sam's margherita right there, but looking them up by their order number fails.
Can you find what changes on the way through JSON and fix the loading, so a restart is invisible to customers?
