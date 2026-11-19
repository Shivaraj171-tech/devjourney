from app.order import Order


def test_new_order_keeps_its_details():
    order = Order(1001, "Sam")
    assert order.order_id == 1001, f"order_id should be 1001, got {order.order_id!r}"
    assert order.customer == "Sam", f"customer should be 'Sam', got {order.customer!r}"
    assert order.status == "new", f"a new order's status should be 'new', got {order.status!r}"


def test_item_count_counts_the_items():
    order = Order(1001, "Sam", [1250, 450])
    order.add_item(299)
    count = order.item_count()
    assert count == 3, f"an order with items [1250, 450, 299] has 3 items, but item_count() returned {count!r}"


def test_subtotal_adds_up_the_prices():
    order = Order(1001, "Sam", [1250, 450])
    subtotal = order.subtotal()
    assert subtotal == 1700, f"1250 + 450 is 1700 cents, but subtotal() returned {subtotal!r}"


def test_empty_order_has_nothing_in_it():
    order = Order(1002, "Ana")
    assert order.item_count() == 0, f"a new, empty order should have 0 items, got {order.item_count()!r}"
    assert order.subtotal() == 0, f"a new, empty order should cost 0 cents, got {order.subtotal()!r}"


def test_label_for_the_kitchen_screen():
    order = Order(1001, "Sam", [1250, 450])
    label = order.label()
    assert label == "Order 1001 for Sam: $17.00", f"expected 'Order 1001 for Sam: $17.00', got {label!r}"


def test_label_follows_new_items():
    order = Order(1003, "Lee")
    order.add_item(299)
    label = order.label()
    assert label == "Order 1003 for Lee: $2.99", (
        f"after adding a $2.99 lemonade, expected 'Order 1003 for Lee: $2.99', got {label!r}"
    )


def test_orders_do_not_share_items():
    sam = Order(1001, "Sam")
    ana = Order(1002, "Ana")
    sam.add_item(1250)
    assert ana.item_count() == 0, f"Ana's order should still be empty, but it has the items {ana.items}"
