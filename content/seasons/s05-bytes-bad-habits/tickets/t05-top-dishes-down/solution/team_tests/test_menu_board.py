"""Our own tests for the menu board (app/menu_board.py), written by Maya.

CI runs these on every pull request. If one goes red, the CODE is wrong
until someone shows that the test is: a test only changes when the spec does.
"""

from app.menu_board import MENU_BOARD, price_of, vegan_dishes


def test_price_of_a_pizza():
    price = price_of(MENU_BOARD, "marinara")
    assert price == 1050, f"marinara costs 1050 cents, got {price}"


def test_price_of_a_dish_we_dont_sell():
    price = price_of(MENU_BOARD, "sushi")
    assert price is None, f"sushi isn't on the board, so expected None, got {price}"


def test_vegan_dishes_from_every_category():
    names = vegan_dishes(MENU_BOARD)
    expected = ["marinara", "olives", "lemonade"]
    assert names == expected, f"expected {expected}, got {names}"
