**From:** Maya (Tech Lead)
**Ticket:** FEAT-306: Tidy up the launch-night receipts

Week one live: 3,112 orders. None lost at the night restart.
Leo has one complaint. Promo-code customers get an email that says $22.40 and a text that says $27.99. On launch night we copy-pasted the total maths into `app/receipts.py` three times, and one copy forgot the discount.
Write `order_total` once and make all three messages use it, so the next pricing change happens in one place. Same behaviour, better shape.
One more thing. Classes, JSON, team tests, a security review and a lunch rush in one month. Your title in the system says **Junior Developer** now. I changed it this morning.
