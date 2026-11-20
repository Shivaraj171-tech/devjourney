from app.order import Order
from app.refund_report import refund_line, refund_report


def sam_order():
    """$17.00 of food + $3.99 delivery = $20.99 paid."""
    return Order(1001, "Sam", [1250, 450])


def ana_order():
    """$27.99 of food, free delivery."""
    return Order(1002, "Ana", [1250, 1250, 299])


def test_refund_line_still_works():
    line = refund_line(sam_order(), 50)
    expected = "Order 1001 (Sam): 50 min, refund $4.19, voucher $3.00"
    assert line == expected, f"expected {expected!r}, got {line!r}"


def test_one_late_order():
    report = refund_report([(sam_order(), 50)])
    expected = "Order 1001 (Sam): 50 min, refund $4.19, voucher $3.00\nTotal refunded: $4.19"
    assert report == expected, f"expected {expected!r}, got {report!r}"


def test_on_time_orders_are_left_out():
    deliveries = [(sam_order(), 50), (Order(1003, "McKenzie", [450]), 30), (ana_order(), 70)]
    report = refund_report(deliveries)
    expected = (
        "Order 1001 (Sam): 50 min, refund $4.19, voucher $3.00\n"
        "Order 1002 (Ana): 70 min, refund $5.59, voucher $5.00\n"
        "Total refunded: $9.78"
    )
    assert report == expected, (
        f"only the two late orders should be listed, in order, then the total of their refunds.\n"
        f"expected {expected!r}\ngot      {report!r}"
    )


def test_exactly_45_minutes_is_not_in_the_report():
    report = refund_report([(sam_order(), 45), (ana_order(), 46)])
    expected = "Order 1002 (Ana): 46 min, refund $5.59, voucher $3.00\nTotal refunded: $5.59"
    assert report == expected, f"45 minutes is on time, so only Ana is late. expected {expected!r}, got {report!r}"


def test_a_good_day_with_no_late_orders():
    report = refund_report([(sam_order(), 20), (ana_order(), 45)])
    assert report == "No late orders today.", f"nothing was late, so expected 'No late orders today.', got {report!r}"


def test_no_deliveries_at_all():
    report = refund_report([])
    assert report == "No late orders today.", f"an empty day should say 'No late orders today.', got {report!r}"


def test_the_deliveries_list_is_not_changed():
    deliveries = [(sam_order(), 50), (ana_order(), 20)]
    refund_report(deliveries)
    assert len(deliveries) == 2, f"refund_report must not change the list it was given, it now has {len(deliveries)} items"
