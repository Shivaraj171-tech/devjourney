"""Apology texts for late orders.

Written by Byte 🤖.
"""

from app import refunds
from app.menu import format_price
from app.vouchers import late_voucher


def apology_sms(order, delivery_minutes, promo_code=None):
    """The text we send when an order is late, or None if it wasn't late.

    For example: "Sorry Sam! Order 1001 took 50 minutes. We've refunded $4.19
    and added a $3.00 voucher to your account."
    """
    if delivery_minutes >= 45:
        refund = refunds.refund_for_delay(order, delivery_minutes, promo_code)
        voucher = late_voucher(delivery_minutes)
        return (
            f"Sorry {order.customer}! Order {order.order_id} took {delivery_minutes} minutes. "
            f"We've refunded {format_price(refund)} and added a {format_price(voucher)} voucher to your account."
        )
    return None
