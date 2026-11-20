"""Messages we send once an order is placed.

Every message gets the customer's total from order_total, so the maths
lives in one place (tidied up after launch night).

The total is: subtotal - promo discount + delivery fee.
The discount and the delivery fee are both based on the subtotal.
"""

from app.delivery import delivery_fee
from app.menu import format_price
from app.promo import discount_amount


def order_total(order, promo_code=None):
    """Return what the customer pays for this order, in cents.

    This is the ONE place that works out the total; every message uses it.
    """
    subtotal = order.subtotal()
    discount = discount_amount(subtotal, promo_code)
    return subtotal - discount + delivery_fee(subtotal)


def receipt_email(order, promo_code=None):
    """The email receipt, e.g. 'Thanks Sam! Order 1001 total: $22.40'."""
    total = order_total(order, promo_code)
    return f"Thanks {order.customer}! Order {order.order_id} total: {format_price(total)}"


def confirmation_sms(order, promo_code=None):
    """The text message, e.g. 'Orbit Orders: order 1001 confirmed, $22.40 paid.'"""
    total = order_total(order, promo_code)
    return f"Orbit Orders: order {order.order_id} confirmed, {format_price(total)} paid."


def loyalty_points(order, promo_code=None):
    """One loyalty point per whole dollar paid, e.g. $22.40 earns 22 points."""
    return order_total(order, promo_code) // 100
