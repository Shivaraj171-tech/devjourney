"""The order summary shown on the checkout screen."""

from app.cart import cart_subtotal
from app.delivery import delivery_fee
from app.menu import format_price
from app.promo import discount_amount


def order_summary(prices, promo_code=None):
    """Return the checkout summary for a cart, one line per amount.

    prices is the cart: a list of prices in cents.
    promo_code is the code the customer typed, or None if they didn't type one.
    Delivery is based on the subtotal before the discount.
    The total is subtotal - discount + delivery.

    Example for [1250, 1250, 299] with "ORBIT20":
        Subtotal: $27.99
        Discount: $5.59
        Delivery: $0.00
        Total: $22.40
    """
    subtotal = cart_subtotal(prices)
    discount = discount_amount(subtotal, promo_code)
    delivery = delivery_fee(subtotal)
    total = subtotal - discount + delivery

    return (
        f"Subtotal: {format_price(subtotal)}\n"
        f"Discount: {format_price(discount)}\n"
        f"Delivery: {format_price(delivery)}\n"
        f"Total: {format_price(total)}"
    )
