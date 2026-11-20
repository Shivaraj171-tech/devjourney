Copy the shape of `test_small_order_pays_delivery`: a new `def test_...():` with a different amount and the fee you expect. CI tries your tests on four broken versions of `delivery_fee`: (1) Byte's `>` instead of `>=`, so exactly 2500 cents pays the fee; (2) delivery is never free; (3) delivery is always free; (4) a typo that makes delivery free from 2400 cents. For each one, find an amount where the broken version gives a different fee than the real one.
---
Byte's `>` only goes wrong for one amount: exactly 2500 cents. The $24.00 typo only goes wrong between 2400 and 2499 cents. So you need one test right on the edge and one just below it. A test far above the edge (say 4000) guards against free delivery disappearing.
---
Add `def test_exactly_25_dollars_is_free():` with `assert delivery_fee(2500) == 0`, and `def test_just_under_25_dollars_pays():` with `assert delivery_fee(2499) == 399`. Don't change `app/delivery.py`: it's already correct.
