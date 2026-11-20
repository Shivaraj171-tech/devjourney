def parse_tip(text):
    """'2.50' -> 250 (cents). Text that isn't a number raises ValueError, so the form can ask again."""
    return round(float(text) * 100)
