def mask_card(number):
    """'4111222233334444' -> '************4444': a star for every digit but the last 4."""
    return "*" * (len(number) - 4) + number[-4:]
