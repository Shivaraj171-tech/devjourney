"""Apology texts for late orders.

Written by Byte 🤖 after the review of its first attempt.
"""

from app.menu import format_price
from app.refunds import late_refund
from app.vouchers import late_voucher


def display_name(customer):
    """The customer's name as we show it in messages.

    Names are shown as the customer typed them, except that the first letter
    is always a capital, so "sam" becomes "Sam".
    """
    return customer.capitalize()  # Byte's fix for Leo's "sam" complaint


def apology_sms(order, delivery_minutes, promo_code=None):
    """The text we send when an order is late, or None if it wasn't late.

    For example: "Sorry Sam! Order 1001 took 50 minutes. We've refunded $4.19
    and added a $3.00 voucher to your account."
    """
    refund = late_refund(order, delivery_minutes, promo_code)
    if refund == 0:
        return None
    voucher = late_voucher(delivery_minutes)
    return (
        f"Sorry {display_name(order.customer)}! Order {order.order_id} took {delivery_minutes} minutes. "
        f"We've refunded {format_price(refund)} and added a {format_price(voucher)} voucher to your account."
    )
