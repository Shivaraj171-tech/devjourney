from app.tips import tip_amount, total_with_tip


def test_fifteen_percent_of_twenty_dollars():
    tip = tip_amount(2000, 15)
    assert tip == 300, f"a 15% tip on $20.00 (2000 cents) should be 300 cents, got {tip}"


def test_tip_is_rounded_down_to_whole_cents():
    tip = tip_amount(1999, 15)
    assert tip == 299, f"15% of 1999 cents is 299.85, which rounds down to 299, got {tip!r}"


def test_total_includes_the_tip():
    total = total_with_tip([1250, 750], 10)
    assert total == 2200, f"$20.00 of food plus a 10% tip should be 2200 cents, got {total}"


def test_cart_is_not_changed():
    cart = [1250, 750]
    total_with_tip(cart, 20)
    assert cart == [1250, 750], f"the customer's cart should still be [1250, 750], but it became {cart}"


def test_same_answer_every_time():
    cart = [1250, 750]
    first = total_with_tip(cart, 15)
    second = total_with_tip(cart, 15)
    assert first == second == 2300, (
        f"calling total_with_tip twice on the same cart should give 2300 both times, got {first} then {second}"
    )
