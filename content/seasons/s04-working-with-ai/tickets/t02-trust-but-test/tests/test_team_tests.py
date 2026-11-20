"""CI for YOUR tests: it runs the tests in team_tests/test_vouchers.py against
the real late_voucher and against other versions of it, including the
attempts Byte threw away this morning.

Good tests pass on the real code AND fail on every wrong version.
"""

import sys

import app.vouchers
import team_tests.test_vouchers as your_tests

REAL_LATE_VOUCHER = app.vouchers.late_voucher


def bytes_attempt_1(delivery_minutes):
    """Byte's first attempt: >= 45, so exactly 45 minutes already gets a voucher."""
    if delivery_minutes > 60:
        return 500
    if delivery_minutes >= 45:
        return 300
    return 0


def bytes_attempt_2(delivery_minutes):
    """Byte's second attempt: >= 60, so exactly 60 minutes gets the big voucher."""
    if delivery_minutes >= 60:
        return 500
    if delivery_minutes > 45:
        return 300
    return 0


def swapped_amounts(delivery_minutes):
    """The two voucher amounts the wrong way round."""
    if delivery_minutes > 60:
        return 300
    if delivery_minutes > 45:
        return 500
    return 0


def no_big_voucher(delivery_minutes):
    """Someone forgot the $5.00 voucher: every late order gets $3.00."""
    if delivery_minutes > 45:
        return 300
    return 0


def find_your_tests():
    """Every test_ function in team_tests/test_vouchers.py, by name."""
    return {name: func for name, func in vars(your_tests).items() if name.startswith("test_") and callable(func)}


def run_your_tests(voucher_function):
    """Run all your tests with late_voucher swapped for voucher_function.

    Returns {test name: problem} for every test that failed (empty if all passed).
    The swap covers `from app.vouchers import late_voucher` and `import app.vouchers`.
    """
    swapped = []
    for name, module in list(sys.modules.items()):
        if module is None or not (name == "app" or name.startswith(("app.", "team_tests"))):
            continue
        for attr, value in list(vars(module).items()):
            if value is REAL_LATE_VOUCHER:
                setattr(module, attr, voucher_function)
                swapped.append((module, attr))
    failed = {}
    try:
        for name, test in find_your_tests().items():
            try:
                test()
            except Exception as exc:
                failed[name] = f"{type(exc).__name__}: {exc}"
    finally:
        for module, attr in swapped:
            setattr(module, attr, REAL_LATE_VOUCHER)
    return failed


def check_caught(voucher_function, what):
    failed = run_your_tests(voucher_function)
    assert failed, (
        f"Your tests didn't notice this wrong version: {what}. Every one of your tests still passed. "
        f"Add a test with a number of minutes where this version gives a different voucher than the spec says."
    )


def test_you_have_at_least_three_tests():
    names = sorted(find_your_tests())
    assert len(names) >= 3, (
        f"team_tests/test_vouchers.py should have at least 3 test functions (names starting with test_), "
        f"found {len(names)}: {names}"
    )


def test_your_tests_pass_on_the_real_code():
    failed = run_your_tests(REAL_LATE_VOUCHER)
    assert not failed, (
        f"Your tests should all pass on the real late_voucher, but these failed: {failed}. "
        f"Check your expected amounts against the spec: 45 or less is 0, 46 to 60 is 300, more than 60 is 500."
    )


def test_your_tests_catch_bytes_first_attempt():
    check_caught(bytes_attempt_1, "Byte's first attempt, where exactly 45 minutes already gets a $3.00 voucher")


def test_your_tests_catch_bytes_second_attempt():
    check_caught(bytes_attempt_2, "Byte's second attempt, where exactly 60 minutes gets the $5.00 voucher")


def test_your_tests_catch_swapped_amounts():
    check_caught(swapped_amounts, "the two voucher amounts swapped ($5.00 for a bit late, $3.00 for very late)")


def test_your_tests_catch_a_missing_big_voucher():
    check_caught(no_big_voucher, "every late order gets $3.00, even a 90-minute one")
