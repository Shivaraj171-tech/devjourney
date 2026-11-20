"""The "Order again" button: rebuild a cart from a customer's past order."""


def reorder(past_items, menu):
    """Build a new cart (a list of prices in cents) from a past order.

    past_items is a list of item names, like ["margherita", "lemonade"].
    menu is a dictionary of item name -> price in cents, like MENU in app/menu.py.
    Items that are no longer on the menu are skipped.
    """
    cart = []
    for name in past_items:
        if name in menu:
            cart.append(menu[name])
    return cart
