"""End-of-day refund report for Leo (support).

Byte 🤖 wrote this from Maya's second prompt (the one with the examples).
refund_line is done and tested. refund_report is the piece left for us.
"""

from app.apology import display_name
from app.menu import format_price
from app.refunds import late_refund
from app.vouchers import late_voucher


def refund_line(order, delivery_minutes):
    """One line of the report, e.g. 'Order 1001 (Sam): 50 min, refund $4.19, voucher $3.00'."""
    refund = format_price(late_refund(order, delivery_minutes))
    voucher = format_price(late_voucher(delivery_minutes))
    return f"Order {order.order_id} ({display_name(order.customer)}): {delivery_minutes} min, refund {refund}, voucher {voucher}"


def refund_report(deliveries):
    """Return today's refund report as one string, lines separated by "\\n".

    deliveries is a list of (order, delivery_minutes) pairs, one per delivery
    today, oldest first. The spec, from Leo:
      - one refund_line for every LATE delivery (late_refund is more than 0),
        in the same order as deliveries; on-time deliveries are left out
      - then a last line with the total refunded: 'Total refunded: $9.78'
      - if nothing was late, the whole report is just 'No late orders today.'
    """
    # TODO: build the lines, then join them.
    return ""
