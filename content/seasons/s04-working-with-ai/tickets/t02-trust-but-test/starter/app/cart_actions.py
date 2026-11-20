"""Things a customer can do to their cart.

A cart is a list of item prices in cents, for example [1250, 450].
"""


def add_item(cart, price_cents):
    """Add one item (its price in cents) to the end of the cart.

    This changes the cart list itself, so it doesn't need to return anything.
    """
    cart.append(price_cents)


def item_count(cart):
    """Return how many items are in the cart (the number on the cart badge)."""
    return len(cart)
