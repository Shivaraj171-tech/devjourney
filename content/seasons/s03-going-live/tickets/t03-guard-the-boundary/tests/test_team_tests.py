"""CI for YOUR tests: it runs the tests in team_tests/test_delivery.py against
the real delivery_fee and against broken versions of it ("mutants").

Good tests pass on the real code AND fail on every broken version.
"""

import sys

import app.delivery
import team_tests.test_delivery as your_tests

REAL_DELIVERY_FEE = app.delivery.delivery_fee


def bytes_bug(subtotal_cents):
    """Byte's "tidy-up" from last week: > instead of >=."""
    if subtotal_cents > 2500:
        return 0
    return 399


def never_free(subtotal_cents):
    """Someone deleted the free delivery rule."""
    return 399


def always_free(subtotal_cents):
    """Someone made delivery free for everybody."""
    return 0


def threshold_typo(subtotal_cents):
    """A typo in the threshold: free delivery from $24.00 instead of $25.00."""
    if subtotal_cents >= 2400:
        return 0
    return 399


def find_your_tests():
    """Every test_ function in team_tests/test_delivery.py, by name."""
    return {name: func for name, func in vars(your_tests).items() if name.startswith("test_") and callable(func)}


def run_your_tests(fee_function):
    """Run all your tests with delivery_fee swapped for fee_function.

    Returns {test name: problem} for every test that failed (empty if all passed).
    The swap covers `from app.delivery import delivery_fee` and `import app.delivery`.
    """
    swapped = []
    for name, module in list(sys.modules.items()):
        if module is None or not (name == "app" or name.startswith(("app.", "team_tests"))):
            continue
        for attr, value in list(vars(module).items()):
            if value is REAL_DELIVERY_FEE:
                setattr(module, attr, fee_function)
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
            setattr(module, attr, REAL_DELIVERY_FEE)
    return failed


def check_caught(fee_function, what):
    failed = run_your_tests(fee_function)
    assert failed, (
        f"Your tests didn't notice this bug: {what}. Every one of your tests still passed. "
        f"Add a test with an order amount where this broken version gives the wrong fee."
    )


def test_you_have_at_least_two_tests():
    names = sorted(find_your_tests())
    assert len(names) >= 2, (
        f"team_tests/test_delivery.py should have at least 2 test functions (names starting with test_), "
        f"found {len(names)}: {names}"
    )


def test_your_tests_pass_on_the_real_code():
    failed = run_your_tests(REAL_DELIVERY_FEE)
    assert not failed, (
        f"Your tests should all pass on the real delivery_fee, but these failed: {failed}. "
        f"Check the amounts you expect: $25.00 or more is free (0), less pays 399."
    )


def test_your_tests_catch_the_tidy_up_bug():
    check_caught(bytes_bug, "Byte's > instead of >=, so exactly $25.00 pays delivery")


def test_your_tests_catch_free_delivery_going_missing():
    check_caught(never_free, "delivery is never free, even for a $40.00 order")


def test_your_tests_catch_free_delivery_for_everyone():
    check_caught(always_free, "delivery is free for everybody, even a $10.00 order")


def test_your_tests_catch_a_threshold_typo():
    check_caught(threshold_typo, "free delivery starts at $24.00, so a $24.99 order is free")
