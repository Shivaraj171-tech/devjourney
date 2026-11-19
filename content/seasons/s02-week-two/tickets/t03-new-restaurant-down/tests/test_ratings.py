from app.ratings import average_rating, rating_label


def test_new_restaurant_shows_new():
    label = rating_label([])
    assert label == "New!", f"a restaurant with no ratings should show 'New!', got {label!r}"


def test_label_for_rated_restaurant():
    label = rating_label([5, 4, 4])
    assert label == "★ 4.3 (3 ratings)", f"expected '★ 4.3 (3 ratings)', got {label!r}"


def test_average_is_rounded_to_one_decimal():
    average = average_rating([5, 4])
    assert average == 4.5, f"the average of [5, 4] should be 4.5, got {average}"


def test_ratings_list_is_not_changed():
    ratings = [3, 5]
    rating_label(ratings)
    assert ratings == [3, 5], f"rating_label should not change the ratings list, got {ratings}"
