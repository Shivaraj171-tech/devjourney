CODES = {"WELCOME10": 10, "PIZZA5": 5}


def find_discount(code):
    """The discount (in dollars) for a coupon code."""
    if code in CODES:
        return CODES[code]


def price_after_code(price, code):
    return price - find_discount(code)
