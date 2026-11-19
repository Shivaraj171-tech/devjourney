from app.cart import cart_subtotal
from app.cart_actions import add_item, item_count


def test_add_item_to_empty_cart():
    cart = []
    add_item(cart, 1250)
    assert cart == [1250], f"after adding 1250 to an empty cart, expected [1250], got {cart}"


def test_add_item_goes_on_the_end():
    cart = [1250, 450]
    add_item(cart, 299)
    expected = [1250, 450, 299]
    assert cart == expected, f"expected {expected}, got {cart}"


def test_item_count():
    result = item_count([1250, 450, 299])
    assert result == 3, f"item_count([1250, 450, 299]) should be 3, got {result}"


def test_empty_cart_count_is_zero():
    result = item_count([])
    assert result == 0, f"item_count([]) should be 0, got {result}"


def test_badge_and_total_after_adding():
    cart = []
    add_item(cart, 1250)
    add_item(cart, 1250)
    add_item(cart, 299)
    count = item_count(cart)
    total = cart_subtotal(cart)
    assert count == 3, f"badge should show 3 after adding 3 items, got {count}"
    assert total == 2799, f"subtotal should be 2799 after adding 1250, 1250, 299, got {total}"
