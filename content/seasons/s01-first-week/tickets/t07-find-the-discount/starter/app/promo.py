"""Promo codes and discounts.

Written by Jonas before he moved to the payments team.
"""

PROMO_CODES = {
    "WELCOME10": 10,  # percent off
    "ORBIT20": 20,
}
MIN_SUBTOTAL_FOR_PROMO = 1500  # cents ($15.00)


def discount_percent(code):
    """Return the percent off for a promo code, or 0 if the code is unknown.

    Codes are not case-sensitive: "welcome10" works the same as "WELCOME10".
    """
    return PROMO_CODES.get(code.upper(), 0)


def discount_amount(subtotal_cents, code):
    """Return how many cents to take off the subtotal for this promo code.

    Promo codes only work on orders of $15.00 or more.
    The discount is rounded down to a whole number of cents.
    """
    if subtotal_cents < MIN_SUBTOTAL_FOR_PROMO:
        return 0
    percent = discount_percent(code)
    return subtotal_cents * percent // 100
