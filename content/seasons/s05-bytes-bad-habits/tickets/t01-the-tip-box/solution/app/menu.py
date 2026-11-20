"""Menu helpers.

Prices are stored in cents (whole numbers) so we never get rounding errors.
"""

MENU = {
    "margherita": 1250,
    "garlic_bread": 450,
    "lemonade": 299,
}


def format_price(cents):
    """Turn a price in cents into a label like '$12.50'."""
    dollars = cents / 100
    return f"${dollars:.2f}"
