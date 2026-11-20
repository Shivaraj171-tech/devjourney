"""The tip box at checkout: the customer types a tip percent, like "15".

Written by Byte 🤖 ("100% crash-proof"); we made it catch only what it should.
"""

from app.menu import format_price
from app.tips import tip_amount


def tip_line(text, subtotal_cents):
    """The line shown under the tip box at checkout.

    text is exactly what the customer typed, e.g. "15" or " 20 ".
      - a whole number: the tip, e.g. 'Tip: $3.00' for "15" on a $20.00 subtotal
      - anything else ("ten", "15%", ""): tell the customer how to fix it:
        'Tip: please type a whole number, like 15 (you typed "ten")'
    Only a bad tip box is the customer's mistake. Any other error is a bug in
    OUR code: let it crash, so it shows up in the logs instead of hiding.
    """
    try:
        percent = int(text)
    except ValueError:
        return f'Tip: please type a whole number, like 15 (you typed "{text}")'
    return f"Tip: {format_price(tip_amount(subtotal_cents, percent))}"
