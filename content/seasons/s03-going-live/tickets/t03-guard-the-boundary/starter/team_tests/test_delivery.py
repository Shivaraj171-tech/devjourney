"""Our own tests for delivery_fee (app/delivery.py).

The rule: orders of $25.00 (2500 cents) or more get free delivery.
Everything else pays the standard fee of $3.99 (399 cents).

A test is a plain function whose name starts with test_. It calls the code
and uses `assert` to say what the answer must be. If the code is wrong, the
assert fails and the test goes red.

CI runs every test in this file against the real delivery_fee (they must
all pass) and against broken versions of it (at least one must fail).
"""

from app.delivery import delivery_fee


def test_small_order_pays_delivery():
    fee = delivery_fee(1000)
    assert fee == 399, f"a $10.00 order should pay 399 cents delivery, got {fee}"


# TODO: add tests of your own below.
