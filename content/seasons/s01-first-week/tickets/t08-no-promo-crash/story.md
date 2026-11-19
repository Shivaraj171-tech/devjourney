**From:** Ravi (Mobile Developer)
**Ticket:** BUG-108: Checkout crashes when no promo code is entered

Urgent one! 🚨 We switched on promo codes at checkout an hour ago, and now anyone who *doesn't* type a code gets an error screen instead of their order.
The log says `AttributeError: 'NoneType' object has no attribute 'upper'`. When the promo box is left empty, the app passes `None` as the code.
That's most of our customers, so we're losing orders right now. You read `app/promo.py` yesterday, so you're the best person to fix it.
Customers without a code should simply get no discount, and real codes must keep working.
