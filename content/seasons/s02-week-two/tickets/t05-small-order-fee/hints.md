The new `small_order_fee` function and the summary changes are correct (try a $9.99 and a $10.00 order). Look at the *other* changed lines. Byte's PR description mentions something it did "while it was in there".
---
Check the changed line in `delivery_fee` against its docstring with an order of exactly $25.00 (2500 cents). Have you seen this bug before?
---
Flag line 11 of `app/delivery.py`: `>` should still be `>=`, so that $25.00 or more gets free delivery. That's the only problem; leave the rest unflagged.
