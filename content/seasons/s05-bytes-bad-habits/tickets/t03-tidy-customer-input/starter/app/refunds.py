"""Refunds for late orders.

Written by Byte 🤖 over the weekend, from Leo's request:
"customers whose food arrives late should get some money back".
"""

from app.receipts import order_total

LATE_AFTER_MINUTES = 45  # an order is late after this many minutes
LATE_REFUND_PERCENT = 20


def is_late(delivery_minutes):
    """True if an order that took delivery_minutes to arrive counts as late."""
    return delivery_minutes > LATE_AFTER_MINUTES


def late_refund(order, delivery_minutes, promo_code=None):
    """Return how many cents to give back for a late order (0 if it wasn't late)."""
    if not is_late(delivery_minutes):
        return 0
    paid = order_total(order, promo_code)
    return paid * LATE_REFUND_PERCENT // 100


def wrong_item_refund(order, item_price):
    """Return how many cents to give back when one item in the order was wrong."""
    if item_price not in order.items:
        return 0
    return item_price
