"""The kitchen screen: which orders still need to be sent to the kitchen.

Every few seconds the kitchen screen asks for the orders it hasn't seen yet.
orders is a list of today's Order objects (app/order.py), oldest first.
sent_ids is a list of the order ids already sent to the kitchen today.
Both lists grow all day long: at lunchtime there can be thousands of orders.
"""


def orders_to_send(orders, sent_ids):
    """Return the orders whose id is NOT in sent_ids, oldest first.

    Neither list is changed.
    """
    sent = set(sent_ids)  # read the list once; checking a set is instant
    to_send = []
    for order in orders:
        if order.order_id not in sent:
            to_send.append(order)
    return to_send
