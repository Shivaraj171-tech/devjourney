"""Orders, as a class.

Until now an order was a dictionary from create_order() in app/orders.py,
and every screen had to remember its keys and do its own maths. An Order
keeps an order's data AND the things you can do with it together.
"""

from app.cart import cart_subtotal
from app.menu import format_price


class Order:
    """One customer's order.

    order_id is a whole number, like 1001.
    customer is the customer's name, like "Sam".
    items is a list of prices in cents, like [1250, 450].
    """

    def __init__(self, order_id, customer, items=None):
        self.order_id = order_id
        self.customer = customer
        if items is None:
            items = []
        self.items = items
        self.status = "new"

    def add_item(self, price_cents):
        """Add one item (its price in cents) to this order."""
        self.items.append(price_cents)

    def item_count(self):
        """Return how many items are in this order."""
        return len(self.items)

    def subtotal(self):
        """Return the total price of this order's items, in cents.

        cart_subtotal (from app/cart.py) can do the maths for you.
        """
        return cart_subtotal(self.items)

    def label(self):
        """Return the order's line on the kitchen screen.

        For example: 'Order 1001 for Sam: $17.00'.
        Use format_price (from app/menu.py) for the price.
        """
        return f"Order {self.order_id} for {self.customer}: {format_price(self.subtotal())}"
