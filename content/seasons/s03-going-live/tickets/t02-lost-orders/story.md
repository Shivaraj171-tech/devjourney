**From:** Leo (Customer Support)
**Ticket:** BUG-302: "Order not found" after the night restart

Eleven messages before 9 a.m., all from beta testers who ordered late last night. Every one of them sees **Order not found** on the *Track my order* screen. One just says "where is my food".
Maya says the server restarts at 3 a.m. for updates, and `app/storage.py` (Byte's work) saves all open orders as JSON first and loads them back afterwards.
The orders are still in the saved file. I can see Sam's margherita right there. Looking them up by order number fails.
Can you find what changes on the way through JSON and fix the loading, so a restart is invisible to customers?
