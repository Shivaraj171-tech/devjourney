"""Creating new orders.

An order is a dictionary with the customer's name and a list of item prices (cents).
"""


def create_order(customer, items=[]):
    """Start a new order for a customer.

    items is an optional list of prices to start the order with.
    If no items are given, the order starts empty.
    """
    return {"customer": customer, "items": items}
