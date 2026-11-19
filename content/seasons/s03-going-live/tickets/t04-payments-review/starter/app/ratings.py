"""Star ratings for restaurants.

ratings is a list of whole-number stars (1 to 5) that customers gave
a restaurant, for example [5, 4, 4]. New restaurants have no ratings yet: [].
"""


def average_rating(ratings):
    """Return the average star rating, rounded to one decimal place."""
    return round(sum(ratings) / len(ratings), 1)


def rating_label(ratings):
    """Return the label shown next to a restaurant's name at checkout.

    For example '★ 4.3 (3 ratings)'.
    New restaurants with no ratings yet show 'New!' instead.
    """
    if len(ratings) == 0:
        return "New!"
    average = average_rating(ratings)
    return f"★ {average} ({len(ratings)} ratings)"
