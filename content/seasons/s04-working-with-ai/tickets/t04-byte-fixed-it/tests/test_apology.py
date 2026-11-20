"""Tests for app/apology.py.

The first four tests were written when the apology text was merged, and
they all passed then. The last one is Leo's report that Byte just fixed.
"""

from app.apology import apology_sms, display_name
from app.order import Order


def test_name_typed_with_a_capital_stays_the_same():
    name = display_name("Sam")
    assert name == "Sam", f"display_name('Sam') should be 'Sam', got {name!r}"


def test_names_with_capitals_inside_keep_them():
    name = display_name("McKenzie")
    assert name == "McKenzie", (
        f"display_name('McKenzie') should stay 'McKenzie' (names are shown as typed), got {name!r}"
    )


def test_two_part_names_keep_both_capitals():
    name = display_name("Ana Lucia")
    assert name == "Ana Lucia", f"display_name('Ana Lucia') should stay 'Ana Lucia', got {name!r}"


def test_apology_sms_uses_the_name_as_typed():
    text = apology_sms(Order(1004, "DeShawn", [1250, 450]), 50)
    expected = (
        "Sorry DeShawn! Order 1004 took 50 minutes. "
        "We've refunded $4.19 and added a $3.00 voucher to your account."
    )
    assert text == expected, f"expected {expected!r}, got {text!r}"


def test_lowercase_name_gets_a_capital_first_letter():
    """Leo's report: customers who type "sam" got "Sorry sam!"."""
    name = display_name("sam")
    assert name == "Sam", f"display_name('sam') should be 'Sam', got {name!r}"


def test_on_time_order_gets_no_text():
    text = apology_sms(Order(1005, "Sam", [1250, 450]), 45)
    assert text is None, f"an order that took 45 minutes is on time, so no apology (None), got {text!r}"
