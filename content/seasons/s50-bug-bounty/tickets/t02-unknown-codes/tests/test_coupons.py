from coupons import price_after_code


def test_a_real_code_gives_its_discount():
    got = price_after_code(30, "WELCOME10")
    assert got == 20, f"$30 with WELCOME10 should be $20, got {got}"


def test_a_mistyped_code_gives_no_discount():
    got = price_after_code(30, "PIZZA50")
    assert got == 30, f"an unknown code should leave $30 as $30, got {got}"


def test_an_empty_code_gives_no_discount():
    got = price_after_code(12, "")
    assert got == 12, f"no code should leave $12 as $12, got {got}"
