"""Tips for our delivery riders.

At checkout the customer can add a tip of 10%, 15% or 20% of the subtotal.
"""

from app.cart import cart_subtotal

TIP_PERCENTS = [10, 15, 20]


def tip_amount(subtotal_cents, percent):
    """Return the tip in cents for a percent of the subtotal.

    percent is a whole number from TIP_PERCENTS, like 15 for 15%.
    The tip is rounded down to a whole number of cents.
    """
    return subtotal_cents * percent // 100


def total_with_tip(prices, percent):
    """Return the cart total in cents with the tip added.

    prices is the cart: a list of prices in cents. The checkout screen
    shows the cart again afterwards, so the cart itself must not change.
    """
    tip = tip_amount(cart_subtotal(prices), percent)
    return cart_subtotal(prices) + tip
