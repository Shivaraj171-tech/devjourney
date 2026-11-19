from app.promo import discount_amount, discount_percent


def test_no_code_means_no_percent():
    result = discount_percent(None)
    assert result == 0, f"discount_percent(None) should be 0, got {result}"


def test_no_code_means_no_discount():
    result = discount_amount(3000, None)
    assert result == 0, f"discount_amount(3000, None) should be 0, got {result}"


def test_small_order_without_code_is_still_fine():
    result = discount_amount(1000, None)
    assert result == 0, f"discount_amount(1000, None) should be 0, got {result}"


def test_real_codes_still_work():
    result = discount_amount(3000, "orbit20")
    assert result == 600, f"discount_amount(3000, 'orbit20') should be 600, got {result}"


def test_unknown_code_still_gives_zero():
    result = discount_amount(3000, "PIZZA")
    assert result == 0, f"discount_amount(3000, 'PIZZA') should be 0, got {result}"
