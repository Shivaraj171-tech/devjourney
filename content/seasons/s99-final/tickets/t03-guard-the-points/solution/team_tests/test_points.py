"""Our own tests for points_for_order (loyalty/points.py).

Read the rules at the top of loyalty/points.py. CI runs every test_ function
in this file against the real points_for_order (they must all pass) and
against the versions Byte almost shipped this week (each one must make at
least one of your tests fail).
"""

from loyalty.points import points_for_order


def test_ten_dollars_earns_ten_points():
    got = points_for_order(1000, 0)
    assert got == 10, f"a $10.00 order should earn 10 points, got {got}"


def test_cents_are_dropped():
    got = points_for_order(1299, 0)
    assert got == 12, f"$12.99 should earn 12 points (cents dropped), got {got}"


def test_exactly_five_dollars_earns_points():
    got = points_for_order(500, 0)
    assert got == 5, f"exactly $5.00 should earn 5 points, got {got}"


def test_under_five_dollars_earns_nothing():
    got = points_for_order(499, 0)
    assert got == 0, f"$4.99 is under $5.00, so 0 points, got {got}"


def test_gold_starts_at_exactly_5000():
    got = points_for_order(1000, 5000)
    assert got == 20, f"5000 lifetime points is gold, so $10.00 earns double (20), got {got}"


def test_just_under_gold_earns_single():
    got = points_for_order(1000, 4999)
    assert got == 10, f"4999 lifetime points is not gold yet, so 10 points, got {got}"
