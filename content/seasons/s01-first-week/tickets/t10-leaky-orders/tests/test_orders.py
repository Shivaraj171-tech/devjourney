from app.cart_actions import add_item
from app.orders import create_order


def test_new_order_starts_empty():
    order = create_order("Sam")
    assert order["items"] == [], f"a new order should start with no items, got {order['items']}"


def test_orders_do_not_share_items():
    sam = create_order("Sam")
    add_item(sam["items"], 1250)
    ana = create_order("Ana")
    assert ana["items"] == [], (
        f"Ana's brand-new order should be empty, but it contains {ana['items']} "
        f"(Sam's items leaked into it)"
    )


def test_each_order_keeps_its_own_items():
    sam = create_order("Sam")
    ana = create_order("Ana")
    add_item(sam["items"], 1250)
    add_item(ana["items"], 299)
    assert sam["items"] == [1250], f"Sam's order should be [1250], got {sam['items']}"
    assert ana["items"] == [299], f"Ana's order should be [299], got {ana['items']}"


def test_starting_items_are_kept():
    order = create_order("Lee", [450, 299])
    assert order["items"] == [450, 299], f"expected [450, 299], got {order['items']}"
    assert order["customer"] == "Lee", f"expected customer 'Lee', got {order['customer']!r}"
