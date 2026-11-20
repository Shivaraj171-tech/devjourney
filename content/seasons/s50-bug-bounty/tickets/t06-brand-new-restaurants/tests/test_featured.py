from featured import worth_featuring


def test_a_great_restaurant_is_featured():
    assert worth_featuring(45, 10) is True, "45 stars over 10 reviews is 4.5: feature it"


def test_an_average_restaurant_is_not():
    assert worth_featuring(30, 10) is False, "30 stars over 10 reviews is 3.0: don't feature it"


def test_a_brand_new_restaurant_is_not_featured():
    assert worth_featuring(0, 0) is False, "no reviews yet: don't feature it (and don't crash)"
