"""CI for YOUR tests: it runs the tests in team_tests/test_points.py against
the real points_for_order and against Byte's four earlier versions of it.

Good tests pass on the real code AND fail on every one of Byte's versions.
"""

import sys

import loyalty.points
import team_tests.test_points as your_tests

REAL = loyalty.points.points_for_order


def byte_monday(total_cents, lifetime_points):
    """Monday: <= instead of <, so exactly $5.00 earns nothing."""
    if total_cents <= 500:
        return 0
    points = total_cents // 100
    return points * 2 if lifetime_points >= 5000 else points


def byte_tuesday(total_cents, lifetime_points):
    """Tuesday: round() instead of dropping the cents, so $12.99 earns 13."""
    if total_cents < 500:
        return 0
    points = round(total_cents / 100)
    return points * 2 if lifetime_points >= 5000 else points


def byte_wednesday(total_cents, lifetime_points):
    """Wednesday: compared the tier to "Gold", so nobody ever earns double."""
    if total_cents < 500:
        return 0
    points = total_cents // 100
    if loyalty.points.tier(lifetime_points) == "Gold":
        points *= 2
    return points


def byte_thursday(total_cents, lifetime_points):
    """Thursday: > instead of >=, so exactly 5000 lifetime points isn't gold."""
    if total_cents < 500:
        return 0
    points = total_cents // 100
    return points * 2 if lifetime_points > 5000 else points


def find_your_tests():
    """Every test_ function in team_tests/test_points.py, by name."""
    return {name: func for name, func in vars(your_tests).items() if name.startswith("test_") and callable(func)}


def run_your_tests(version):
    """Run all your tests with points_for_order swapped for `version`.

    Returns {test name: problem} for every test that failed (empty if all passed).
    """
    swapped = []
    for name, module in list(sys.modules.items()):
        if module is None or not (name == "loyalty" or name.startswith(("loyalty.", "team_tests"))):
            continue
        for attr, value in list(vars(module).items()):
            if value is REAL:
                setattr(module, attr, version)
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
            setattr(module, attr, REAL)
    return failed


def check_caught(version, day):
    failed = run_your_tests(version)
    assert failed, f"Your tests didn't notice Byte's {day} version. Every one of your tests still passed on it."


def test_you_have_at_least_three_tests():
    names = sorted(find_your_tests())
    assert len(names) >= 3, f"team_tests/test_points.py needs at least 3 test functions, found {len(names)}: {names}"


def test_your_tests_pass_on_the_real_code():
    failed = run_your_tests(REAL)
    assert not failed, f"Your tests should all pass on the real points_for_order, but these failed: {failed}"


def test_your_tests_catch_mondays_version():
    check_caught(byte_monday, "Monday")


def test_your_tests_catch_tuesdays_version():
    check_caught(byte_tuesday, "Tuesday")


def test_your_tests_catch_wednesdays_version():
    check_caught(byte_wednesday, "Wednesday")


def test_your_tests_catch_thursdays_version():
    check_caught(byte_thursday, "Thursday")
