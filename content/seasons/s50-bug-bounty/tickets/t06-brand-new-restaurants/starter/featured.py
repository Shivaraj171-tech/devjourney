def worth_featuring(total_stars, reviews):
    """True if the restaurant has reviews and averages at least 4 stars."""
    return total_stars / reviews >= 4 and reviews > 0
