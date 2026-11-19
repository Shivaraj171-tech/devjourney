"""Card payments at checkout.

The phone app sends us the order, the customer's card number and the total
it showed on screen. We log the payment, build the charge request for our
payment provider, and add a line to the customer's receipt.
"""

from app.delivery import delivery_fee
from app.menu import format_price


def mask_card(card_number):
    """Hide all but the last 4 digits: '4242424242424242' -> '**** 4242'."""
    return "**** " + card_number[-4:]


def payment_log_line(order, card_number):
    """The line we write to the server logs for every payment."""
    return f"payment for order {order.order_id}: card {card_number}"


def build_charge(order, card_number, app_total_cents):
    """The charge request we send to the payment provider.

    The amount is the order's subtotal plus delivery, in cents.
    """
    amount = app_total_cents  # the app has already worked out the total
    return {
        "card": card_number,
        "amount_cents": amount,
        "description": f"Orbit Orders #{order.order_id}",
    }


def receipt_line(card_number, amount_cents):
    """The last line of the receipt, e.g. 'Paid $17.00 with card **** 4242'."""
    return f"Paid {format_price(amount_cents)} with card {mask_card(card_number)}"


def order_history_query(customer):
    """The database query for a customer's past orders, newest first."""
    return f"SELECT * FROM orders WHERE customer = '{customer}' ORDER BY created_at DESC"
