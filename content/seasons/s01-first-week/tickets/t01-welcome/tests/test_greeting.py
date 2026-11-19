from app.greeting import greet


def test_greets_customer_by_name():
    result = greet("Sam")
    expected = "Welcome back to Orbit Orders, Sam!"
    assert result == expected, f"expected {expected!r}, got {result!r}"


def test_uses_whatever_name_it_is_given():
    result = greet("Ana")
    expected = "Welcome back to Orbit Orders, Ana!"
    assert result == expected, f"expected {expected!r}, got {result!r}"
