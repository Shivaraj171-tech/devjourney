from app.badges import is_top_rated


def check(ratings, expected, why):
    result = is_top_rated(ratings)
    assert result is expected, f"is_top_rated({ratings}) should be {expected} ({why}), got {result!r}"


def test_five_great_ratings_are_top_rated():
    check([5, 5, 5, 4, 4], True, "5 ratings with an average of 4.6")


def test_average_of_exactly_4_5_counts():
    check([5, 4, 5, 4, 5, 4], True, "an average of exactly 4.5 is enough")


def test_low_average_is_not_top_rated():
    check([4, 4, 4, 4, 4, 4], False, "the average is only 4.0")


def test_one_five_star_rating_is_not_enough():
    check([5], False, "it needs at least 5 ratings")


def test_four_ratings_are_not_enough():
    check([5, 5, 5, 5], False, "it needs at least 5 ratings")


def test_new_restaurant_is_not_top_rated():
    check([], False, "no ratings yet, and it must not crash")
