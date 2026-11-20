"""The loyalty line on the order confirmation screen.

Priya's request (FEAT-506): "On the confirmation screen, show the points the
order earned, like 'You earned 22 points!'. Use the points we already give
(loyalty_points in app/receipts.py). Nothing else changes."

Byte 🤖 drafted it with three "improvements" nobody asked for; we shipped
only what Priya asked for. Extras get their own ticket, if Priya wants them.
"""

from app.receipts import loyalty_points


def points_message(order, promo_code=None):
    """The line on the confirmation screen, e.g. 'You earned 22 points!'."""
    points = loyalty_points(order, promo_code)
    return f"You earned {points} points!"
