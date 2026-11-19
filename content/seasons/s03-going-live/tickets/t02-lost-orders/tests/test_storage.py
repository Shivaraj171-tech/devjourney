import json

from app.order import Order
from app.storage import orders_from_json, orders_to_json


def restart(orders):
    """Save the orders as JSON text and load them back, like the nightly restart."""
    return orders_from_json(orders_to_json(orders))


def test_saved_orders_are_json_text():
    text = orders_to_json({1001: Order(1001, "Sam", [1250, 450])})
    assert isinstance(text, str), f"orders_to_json should return text (a str), got {type(text).__name__}"
    data = json.loads(text)
    assert len(data) == 1, f"the JSON should hold 1 order, got {data}"


def test_order_can_be_found_by_id_after_restart():
    loaded = restart({1001: Order(1001, "Sam", [1250, 450])})
    assert 1001 in loaded, (
        f"after a restart, loaded[1001] should find Sam's order, but the keys are {list(loaded)}. "
        f"Look closely at the quotes: is that the number 1001 or the text '1001'?"
    )


def test_order_keeps_a_whole_number_id():
    loaded = restart({1001: Order(1001, "Sam", [1250, 450])})
    order = list(loaded.values())[0]
    assert order.order_id == 1001, (
        f"the loaded order's order_id should be the number 1001, got {order.order_id!r} "
        f"(a {type(order.order_id).__name__})"
    )


def test_customer_items_and_status_survive():
    sam = Order(1001, "Sam", [1250, 450])
    sam.status = "cooking"
    order = list(restart({1001: sam}).values())[0]
    assert order.customer == "Sam", f"customer should be 'Sam', got {order.customer!r}"
    assert order.items == [1250, 450], f"items should be [1250, 450], got {order.items!r}"
    assert order.status == "cooking", f"status should be 'cooking', got {order.status!r}"
    assert order.label() == "Order 1001 for Sam: $17.00", (
        f"the loaded order should still work like an Order, but label() gave {order.label()!r}"
    )


def test_every_order_comes_back():
    orders = {1001: Order(1001, "Sam", [1250]), 1002: Order(1002, "Ana", [299, 299])}
    loaded = restart(orders)
    assert sorted(loaded) == [1001, 1002], f"expected the order ids [1001, 1002] after a restart, got {sorted(loaded, key=str)}"
    assert loaded[1002].customer == "Ana", f"order 1002 should be Ana's, got {loaded[1002].customer!r}"


def test_no_orders_is_fine():
    loaded = restart({})
    assert loaded == {}, f"saving and loading no orders should give an empty dictionary, got {loaded!r}"
