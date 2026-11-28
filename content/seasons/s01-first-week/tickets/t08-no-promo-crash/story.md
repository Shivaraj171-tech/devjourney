**From:** Ravi (Mobile Developer)
**Ticket:** BUG-108: Checkout crashes when no promo code is entered

Urgent. We switched on promo codes at checkout an hour ago, and anyone who *doesn't* type a code gets an error screen instead of their order.
The log says `AttributeError: 'NoneType' object has no attribute 'upper'`. When the promo box is left empty, the app sends `None` as the code.
That's most of our customers, so we're losing orders right now. You read `app/promo.py` yesterday, which makes you the person who knows it best.
Customers without a code should get no discount, and real codes must keep working.
