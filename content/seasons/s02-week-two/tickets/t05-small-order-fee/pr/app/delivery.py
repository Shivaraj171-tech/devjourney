"""Delivery fee rules."""

FREE_DELIVERY_THRESHOLD = 2500  # cents ($25.00)
STANDARD_FEE = 399  # cents ($3.99)
SMALL_ORDER_LIMIT = 1000  # cents ($10.00)
SMALL_ORDER_FEE = 150  # cents ($1.50)


def delivery_fee(subtotal_cents):
    """Orders of $25.00 or more get free delivery. Everything else pays the standard fee."""
    if subtotal_cents > FREE_DELIVERY_THRESHOLD:
        return 0
    return STANDARD_FEE


def small_order_fee(subtotal_cents):
    """Orders under $10.00 pay an extra $1.50 small-order fee. $10.00 or more pays nothing."""
    if subtotal_cents < SMALL_ORDER_LIMIT:
        return SMALL_ORDER_FEE
    return 0
