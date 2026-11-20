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
