import app.receipts as receipts
from app.menu import format_price
from app.order import Order
from app.summary import order_summary


def lunch_order():
    """Sam's launch-day lunch: two margheritas and a lemonade ($27.99)."""
    return Order(1001, "Sam", [1250, 1250, 299])


def test_order_total_with_a_promo_code():
    total = receipts.order_total(lunch_order(), "ORBIT20")
    assert total == 2240, (
        f"$27.99 with ORBIT20 (20% off) and free delivery should be 2240 cents, got {total!r}"
    )


def test_order_total_without_a_promo_code():
    total = receipts.order_total(Order(1002, "Ana", [1250, 450]))
    assert total == 2099, f"$17.00 plus $3.99 delivery should be 2099 cents, got {total!r}"


def test_order_total_agrees_with_the_checkout_screen():
    order = lunch_order()
    checkout_total = order_summary(order.items, "ORBIT20").splitlines()[-1]
    mine = f"Total: {format_price(receipts.order_total(order, 'ORBIT20'))}"
    assert mine == checkout_total, f"the checkout screen says {checkout_total!r}, but order_total gives {mine!r}"


def test_receipt_email():
    text = receipts.receipt_email(lunch_order(), "ORBIT20")
    assert text == "Thanks Sam! Order 1001 total: $22.40", f"expected 'Thanks Sam! Order 1001 total: $22.40', got {text!r}"


def test_confirmation_sms_includes_the_discount():
    text = receipts.confirmation_sms(lunch_order(), "ORBIT20")
    expected = "Orbit Orders: order 1001 confirmed, $22.40 paid."
    assert text == expected, f"expected {expected!r} (with the ORBIT20 discount), got {text!r}"


def test_loyalty_points():
    points = receipts.loyalty_points(lunch_order(), "ORBIT20")
    assert points == 22, f"$22.40 paid earns 22 points, got {points!r}"


def test_every_message_uses_order_total():
    """Swap order_total for a fake that always says $42.42, and check every message follows it."""
    real_order_total = receipts.order_total

    def fake_order_total(order, promo_code=None):
        return 4242

    receipts.order_total = fake_order_total
    try:
        email = receipts.receipt_email(lunch_order(), "ORBIT20")
        sms = receipts.confirmation_sms(lunch_order(), "ORBIT20")
        points = receipts.loyalty_points(lunch_order(), "ORBIT20")
    finally:
        receipts.order_total = real_order_total
    not_using = []
    if "$42.42" not in email:
        not_using.append("receipt_email")
    if "$42.42" not in sms:
        not_using.append("confirmation_sms")
    if points != 42:
        not_using.append("loyalty_points")
    assert not not_using, (
        f"These still work out the total by themselves instead of calling order_total: {', '.join(not_using)}. "
        f"(This check swaps order_total for a fake that always says $42.42, and looks for it in every message.)"
    )
