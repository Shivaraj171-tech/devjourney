"""The menu board: our menu grouped by category, for the new menu screen.

A board is a dictionary {category: list of dishes}, and every dish is a
dictionary with its "name", its "price" in cents and "vegan" (True/False).

Written by Byte 🤖.
"""

MENU_BOARD = {
    "pizza": [
        {"name": "margherita", "price": 1250, "vegan": False},
        {"name": "marinara", "price": 1050, "vegan": True},
    ],
    "sides": [
        {"name": "garlic_bread", "price": 450, "vegan": False},
        {"name": "olives", "price": 350, "vegan": True},
    ],
    "drinks": [
        {"name": "lemonade", "price": 299, "vegan": True},
    ],
}


def price_of(board, name):
    """The price in cents of the dish called name, or None if it isn't on the board."""
    for category in board:
        for dish in board[category]:
            if dish["name"] == name:
                return dish["price"]
    return None


def vegan_dishes(board):
    """The names of every vegan dish on the board, category by category,
    in menu order. For MENU_BOARD: ['marinara', 'olives', 'lemonade']."""
    names = []
    for category in board:
        for dish in board[category]:
            if dish["vegan"]:
                names.append(dish["name"])
    return names
