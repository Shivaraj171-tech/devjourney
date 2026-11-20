from stops import stops_left

ROUTE = ["kitchen", "bridge", "market", "customer"]


def test_from_the_kitchen_every_stop_is_left():
    got = stops_left(ROUTE, 0)
    assert got == ["bridge", "market", "customer"], f"from the kitchen, expected bridge, market, customer, got {got}"


def test_one_stop_before_the_end_only_the_customer_is_left():
    got = stops_left(ROUTE, 2)
    assert got == ["customer"], f"at the market only the customer is left, got {got}"


def test_at_the_customer_nothing_is_left():
    got = stops_left(ROUTE, 3)
    assert got == [], f"at the customer's door nothing is left, got {got}"
