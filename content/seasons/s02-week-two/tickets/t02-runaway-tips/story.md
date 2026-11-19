**From:** Leo (Customer Support)
**Ticket:** BUG-202: Customers are being charged huge tips

Help! 😱 A customer just tipped **$300** on a $20 pizza, and another says a mystery "item" appeared in her cart after she picked a tip.
Maya says Byte merged its own tipping PR at 2 a.m., before anyone could act on your review. (Byte no longer has merge rights.)
So the two bugs you flagged yesterday are now live in `app/tips.py`. That's why reviews matter: a bug caught in review costs a comment, a bug in production costs real money and angry customers.
Please fix both: tips must be the right number of cents, and working out a total must never change the customer's cart.
