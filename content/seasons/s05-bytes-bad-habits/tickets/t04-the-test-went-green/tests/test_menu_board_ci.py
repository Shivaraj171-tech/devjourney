"""CI for the menu board: the code must be right, Maya's tests must pass on it,
and Maya's tests must still catch Byte's bug (so editing them to agree with
the code doesn't count as a fix)."""

import sys

import app.menu_board
import team_tests.test_menu_board as maya_tests
from app.menu_board import MENU_BOARD, vegan_dishes

REAL_VEGAN_DISHES = app.menu_board.vegan_dishes


def bytes_vegan_dishes(board):
    """Byte's version: it saves the CATEGORY instead of the dish's name."""
    names = []
    for category in board:
        for dish in board[category]:
            if dish["vegan"]:
                names.append(category)
    return names


def run_maya_tests():
    """Run every test_ function in team_tests/test_menu_board.py. Returns {name: problem} for the failures."""
    failed = {}
    for name, test in vars(maya_tests).items():
        if name.startswith("test_") and callable(test):
            try:
                test()
            except Exception as exc:
                failed[name] = f"{type(exc).__name__}: {exc}"
    return failed


def test_vegan_dishes_on_the_real_menu():
    names = vegan_dishes(MENU_BOARD)
    expected = ["marinara", "olives", "lemonade"]
    assert names == expected, f"expected the dish NAMES {expected}, got {names}"


def test_a_category_with_two_vegan_dishes():
    board = {
        "salads": [
            {"name": "green", "price": 800, "vegan": True},
            {"name": "caesar", "price": 900, "vegan": False},
            {"name": "beetroot", "price": 850, "vegan": True},
        ],
    }
    names = vegan_dishes(board)
    assert names == ["green", "beetroot"], f"both vegan salads, in menu order: expected ['green', 'beetroot'], got {names}"


def test_empty_categories_and_no_vegan_dishes():
    board = {
        "pizza": [],
        "drinks": [
            {"name": "milkshake", "price": 450, "vegan": False},
            {"name": "water", "price": 100, "vegan": True},
        ],
        "desserts": [{"name": "tiramisu", "price": 600, "vegan": False}],
    }
    names = vegan_dishes(board)
    assert names == ["water"], f"only the water is vegan: expected ['water'], got {names}"


def test_maya_tests_pass_on_your_code():
    failed = run_maya_tests()
    assert not failed, f"Maya's tests in team_tests/test_menu_board.py must pass on your code, but these failed: {failed}"


def test_maya_tests_still_catch_bytes_bug():
    swapped = []
    for name, module in list(sys.modules.items()):
        if module is None or not (name == "app" or name.startswith(("app.", "team_tests"))):
            continue
        for attr, value in list(vars(module).items()):
            if value is REAL_VEGAN_DISHES:
                setattr(module, attr, bytes_vegan_dishes)
                swapped.append((module, attr))
    try:
        failed = run_maya_tests()
    finally:
        for module, attr in swapped:
            setattr(module, attr, REAL_VEGAN_DISHES)
    assert failed, (
        "Maya's tests all pass on Byte's broken vegan_dishes (the one that lists categories), "
        "so they can't catch it any more. Was a test edited to agree with the code? Put back what the spec says."
    )
