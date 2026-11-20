def add_to_basket(item, basket=None):
    """Add item to basket and return it. With no basket, start a new, empty one."""
    if basket is None:
        basket = []
    basket.append(item)
    return basket
