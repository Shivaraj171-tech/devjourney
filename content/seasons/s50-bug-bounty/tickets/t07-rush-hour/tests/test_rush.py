from rush import busiest_hour


def test_yesterday():
    got = busiest_hour([(12, 40), (18, 95), (20, 60)])
    assert got == 18, f"95 orders at 18:00 is the most, expected 18, got {got}"


def test_a_quiet_day():
    got = busiest_hour([(9, 3), (13, 7)])
    assert got == 13, f"7 orders at 13:00 is the most, expected 13, got {got}"
