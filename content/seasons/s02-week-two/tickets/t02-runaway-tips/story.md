**From:** Leo (Customer Support)
**Ticket:** BUG-202: Customers are being charged huge tips

Two tickets in ten minutes. One customer tipped **$300** on a $20 pizza. Another wrote "there's a random item in my cart and I didn't add it". It appeared after she picked a tip.
Maya says Byte merged its own tipping PR at 2 a.m., before anyone acted on your review. (Byte doesn't have merge rights any more.)
So the two bugs you flagged yesterday are live in `app/tips.py`. In review they would have cost one comment each. In production they cost a $300 tip, a refund and an apology I wrote twice.
Please fix both: tips must be the right number of cents, and working out a total must never change the customer's cart.
