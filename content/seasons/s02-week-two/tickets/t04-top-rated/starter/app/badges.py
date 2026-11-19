"""Badges shown on restaurant cards in the app."""

from app.ratings import average_rating

TOP_RATED_MIN_RATINGS = 5
TOP_RATED_MIN_AVERAGE = 4.5


def is_top_rated(ratings):
    """Return True if a restaurant earns the "Top rated" badge, otherwise False.

    ratings is a list of stars (1 to 5), like in app/ratings.py.
    A restaurant is top rated only when BOTH of these are true:
      - it has at least TOP_RATED_MIN_RATINGS ratings (5), and
      - its average rating is TOP_RATED_MIN_AVERAGE (4.5) or higher.
    New restaurants with no ratings are never top rated.
    """
    # Byte's first draft. It only checks the average.
    return average_rating(ratings) >= TOP_RATED_MIN_AVERAGE
