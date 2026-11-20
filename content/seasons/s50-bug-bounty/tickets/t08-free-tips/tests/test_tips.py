from tips import parse_tip


def test_a_normal_tip():
    got = parse_tip("2.50")
    assert got == 250, f"'2.50' is 250 cents, got {got}"


def test_a_typo_is_reported():
    try:
        got = parse_tip("two")
    except ValueError:
        return
    assert False, f"'two' isn't a number: parse_tip should raise ValueError, but it returned {got}"


def test_a_comma_is_reported():
    try:
        got = parse_tip("2,50")
    except ValueError:
        return
    assert False, f"'2,50' isn't a Python number: parse_tip should raise ValueError, but it returned {got}"
