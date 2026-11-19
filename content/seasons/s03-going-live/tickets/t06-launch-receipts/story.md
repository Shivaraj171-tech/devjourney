**From:** Maya (Tech Lead)
**Ticket:** FEAT-306: Tidy up the launch-night receipts

We're live! 🎉 Over 3,000 real orders in week one, and not a single one lost at the night restart.
But Leo has a complaint: promo-code customers get an email saying $22.40 and a text saying $27.99, because on launch night we copy-pasted the total maths into `app/receipts.py` three times and one copy forgot the discount.
Please write `order_total` once and make all three messages use it, so the next pricing change happens in one place: same behaviour, better shape.
And one more thing: after a month of classes, JSON, team tests, a security review and a lunch rush, it's official. You're a **Junior Developer** now, and the whole team is proud of you! 🚀
