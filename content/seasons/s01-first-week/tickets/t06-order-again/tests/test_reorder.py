from app.reorder import reorder

MENU_TODAY = {
    "margherita": 1250,
    "lemonade": 299,
}


def check(past_items, expected):
    result = reorder(past_items, MENU_TODAY)
    assert result == expected, f"reorder({past_items}) should give {expected}, got {result}"


def test_everything_still_on_the_menu():
    check(["margherita", "lemonade"], [1250, 299])


def test_removed_item_is_skipped():
    check(["margherita", "garlic_bread", "lemonade"], [1250, 299])


def test_only_removed_items_gives_empty_cart():
    check(["garlic_bread"], [])


def test_uses_todays_prices():
    menu = {"margherita": 1300}
    result = reorder(["margherita"], menu)
    assert result == [1300], f"reorder should use the price from the menu it's given (1300), got {result}"
