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


def test_exactly_25_dollars_is_free():
    fee = delivery_fee(2500)
    assert fee == 0, f"exactly $25.00 should get free delivery, got {fee}"


def test_just_under_25_dollars_pays():
    fee = delivery_fee(2499)
    assert fee == 399, f"$24.99 is under $25.00, so it should pay 399 cents, got {fee}"


def test_big_order_is_free():
    fee = delivery_fee(4000)
    assert fee == 0, f"a $40.00 order should get free delivery, got {fee}"
