"""Shopping cart helpers.

A cart is a list of item prices in cents, in the order they were added,
for example [1250, 450, 299].
"""


def cart_subtotal(prices):
    """Add up the prices (in cents) of everything in the cart."""
    total = 0
    for i in range(len(prices) - 1):
        total = total + prices[i]
    return total
