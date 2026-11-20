from app.loyalty import points_message
from app.order import Order
from app.receipts import loyalty_points


def sam_order():
    """$17.00 of food + $3.99 delivery = $20.99 paid: 20 points."""
    return Order(1001, "Sam", [1250, 450])


def ana_order():
    """$27.99 of food, free delivery."""
    return Order(1002, "Ana", [1250, 1250, 299])


def test_the_points_line():
    message = points_message(sam_order())
    assert message == "You earned 20 points!", f"Sam paid $20.99, so 20 points: expected 'You earned 20 points!', got {message!r}"


def test_priyas_example_with_a_promo_code():
    message = points_message(ana_order(), "ORBIT20")
    assert message == "You earned 22 points!", f"Ana pays $22.40 with ORBIT20, so 22 points, got {message!r}"


def test_the_same_order_twice_gives_the_same_points():
    first = points_message(Order(1003, "Leo", [1250, 450]))
    second = points_message(Order(1004, "Leo", [1250, 450]))
    assert first == second, (
        f"two identical orders should earn the same points, got {first!r} and then {second!r}. "
        "Is something remembering customers between calls?"
    )


def test_a_big_order_gets_the_same_wording():
    message = points_message(Order(1005, "Maya", [1250] * 10))
    assert message == "You earned 125 points!", f"$125.00 is 125 points, in the same words as every order, got {message!r}"


def test_the_points_match_the_receipt():
    for order in [sam_order(), ana_order(), Order(1006, "Priya", [299])]:
        expected = f"You earned {loyalty_points(order)} points!"
        message = points_message(order)
        assert message == expected, f"order {order.order_id}: the screen must show the same points as loyalty_points, expected {expected!r}, got {message!r}"


def test_loyalty_points_did_not_change():
    points = loyalty_points(ana_order(), "ORBIT20")
    assert points == 22, f"loyalty_points itself must not change: expected 22, got {points}"
