from app.dispatch import retry_waits, total_wait


def test_waits_up_to_8_seconds():
    waits = retry_waits(8)
    assert waits == [1, 2, 4, 8], f"start at 1, double each time, stop after 8: expected [1, 2, 4, 8], got {waits}"


def test_the_first_wait_is_1_second():
    waits = retry_waits(100)
    assert waits[:1] == [1], f"the first retry should come after 1 second, got the waits {waits}"


def test_never_waits_longer_than_max_wait():
    waits = retry_waits(10)
    assert waits == [1, 2, 4, 8], f"16 is more than 10, so it isn't a wait: expected [1, 2, 4, 8], got {waits}"


def test_a_max_wait_of_1():
    waits = retry_waits(1)
    assert waits == [1], f"with max_wait 1 there is exactly one wait of 1 second, got {waits}"


def test_no_waiting_at_all():
    waits = retry_waits(0)
    assert waits == [], f"max_wait 0 means don't wait at all, expected [], got {waits}"


def test_total_wait_is_15_seconds():
    total = total_wait(8)
    assert total == 15, f"1 + 2 + 4 + 8 = 15 seconds before the kitchen phones a rider, got {total}"
