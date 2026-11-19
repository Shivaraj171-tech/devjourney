"""Delivery fee rules."""

FREE_DELIVERY_THRESHOLD = 2500  # cents ($25.00)
STANDARD_FEE = 399  # cents ($3.99)


def delivery_fee(subtotal_cents):
    """Orders of $25.00 or more get free delivery. Everything else pays the standard fee."""
    if subtotal_cents >= FREE_DELIVERY_THRESHOLD:
        return 0
    return STANDARD_FEE
