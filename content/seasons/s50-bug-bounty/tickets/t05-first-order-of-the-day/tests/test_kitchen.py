from kitchen import count_dishes


def test_counts_each_dish():
    got = count_dishes(["pizza", "tea", "pizza"])
    assert got == {"pizza": 2, "tea": 1}, f"expected {{'pizza': 2, 'tea': 1}}, got {got}"


def test_one_order():
    got = count_dishes(["soup"])
    assert got == {"soup": 1}, f"expected {{'soup': 1}}, got {got}"


def test_no_orders_yet():
    got = count_dishes([])
    assert got == {}, f"no orders means an empty dict, got {got}"
