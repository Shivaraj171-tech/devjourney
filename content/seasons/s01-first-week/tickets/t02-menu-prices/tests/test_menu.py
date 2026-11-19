from app.menu import MENU, format_price


def check(cents, expected):
    result = format_price(cents)
    assert result == expected, f"format_price({cents}) should be {expected!r}, got {result!r}"


def test_formats_a_pizza_price():
    check(1250, "$12.50")


def test_formats_a_price_under_three_dollars():
    check(299, "$2.99")


def test_formats_zero():
    check(0, "$0.00")


def test_every_menu_item_is_under_twenty_dollars():
    for item, cents in MENU.items():
        label = format_price(cents)
        dollars = float(label.lstrip("$"))
        assert dollars < 20, f"{item} shows as {label}, which can't be right"
