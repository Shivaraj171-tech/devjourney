from app.cart import cart_subtotal


def check(prices, expected):
    result = cart_subtotal(prices)
    assert result == expected, f"cart_subtotal({prices}) should be {expected}, got {result}"


def test_three_items():
    check([1250, 450, 299], 1999)


def test_last_item_is_counted():
    check([450, 299], 749)


def test_single_item():
    check([1250], 1250)


def test_empty_cart_is_zero():
    check([], 0)
