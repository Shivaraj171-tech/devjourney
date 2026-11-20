CODES = {"WELCOME10": 10, "PIZZA5": 5}


def find_discount(code):
    """The discount (in dollars) for a coupon code: 0 for a code we don't have."""
    if code in CODES:
        return CODES[code]
    return 0


def price_after_code(price, code):
    return price - find_discount(code)
