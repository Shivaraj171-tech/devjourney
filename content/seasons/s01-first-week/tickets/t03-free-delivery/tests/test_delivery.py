from app.delivery import delivery_fee


def check(subtotal, expected):
    result = delivery_fee(subtotal)
    assert result == expected, f"delivery_fee({subtotal}) should be {expected}, got {result}"


def test_exactly_25_dollars_is_free():
    check(2500, 0)


def test_just_under_25_dollars_pays_the_fee():
    check(2499, 399)


def test_big_order_is_free():
    check(4000, 0)


def test_empty_order_pays_the_fee():
    check(0, 399)
