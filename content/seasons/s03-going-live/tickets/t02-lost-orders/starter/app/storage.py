"""Saving orders so they survive a server restart.

Every night at 3 a.m. the server restarts to install updates. Just before it
stops, it saves every open order as JSON text (orders_to_json). When it starts
again, it loads them back (orders_from_json).

orders is a dictionary {order id: Order}, for example
{1001: Order(1001, "Sam", [1250, 450])}. Order ids are whole numbers.
"""

import json

from app.order import Order


def orders_to_json(orders):
    """Turn a dictionary of orders into JSON text."""
    data = {}
    for order_id, order in orders.items():
        data[order_id] = {
            "customer": order.customer,
            "items": order.items,
            "status": order.status,
        }
    return json.dumps(data)


def orders_from_json(text):
    """Turn JSON text made by orders_to_json back into a dictionary of orders.

    What comes back must match what was saved: the same order ids (whole
    numbers), customers, items and status.
    """
    data = json.loads(text)
    orders = {}
    for order_id, fields in data.items():
        order = Order(order_id, fields["customer"], fields["items"])
        order.status = fields["status"]
        orders[order_id] = order
    return orders
