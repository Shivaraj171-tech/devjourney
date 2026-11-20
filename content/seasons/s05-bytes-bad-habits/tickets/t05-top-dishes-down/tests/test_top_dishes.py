from app.top_dishes import top_banner, top_dishes

LUNCH = {"margherita": 41, "lemonade": 30, "garlic_bread": 30, "tea": 2}


def test_the_home_screen_banner_works_again():
    banner = top_banner(LUNCH)
    expected = "Top today: margherita (41), garlic_bread (30), lemonade (30)"
    assert banner == expected, f"expected {expected!r}, got {banner!r}"


def test_top_dishes_returns_dish_count_pairs():
    top = top_dishes({"margherita": 41, "tea": 2})
    assert top == [("margherita", 41), ("tea", 2)], (
        f"top_dishes must return (dish, count) tuples, most ordered first: expected "
        f"[('margherita', 41), ('tea', 2)], got {top!r}"
    )


def test_most_ordered_first():
    top = top_dishes({"tea": 2, "lemonade": 30, "margherita": 41})
    expected = [("margherita", 41), ("lemonade", 30), ("tea", 2)]
    assert top == expected, f"most ordered first: expected {expected}, got {top!r}"


def test_the_same_count_goes_in_a_to_z_order():
    top = top_dishes({"lemonade": 30, "garlic_bread": 30, "olives": 30})
    expected = [("garlic_bread", 30), ("lemonade", 30), ("olives", 30)]
    assert top == expected, f"dishes with the same count go A-Z: expected {expected}, got {top!r}"


def test_only_the_top_n():
    top = top_dishes(LUNCH, 2)
    expected = [("margherita", 41), ("garlic_bread", 30)]
    assert top == expected, f"top_dishes(counts, 2) gives only the top 2: expected {expected}, got {top!r}"


def test_fewer_dishes_than_n():
    top = top_dishes({"tea": 2})
    assert top == [("tea", 2)], f"with only one dish, the top 3 is just that dish: got {top!r}"


def test_a_quiet_morning():
    banner = top_banner({})
    assert banner == "Top today: no orders yet", f"no orders yet should say so, got {banner!r}"


def test_the_counts_are_not_changed():
    counts = {"lemonade": 30, "margherita": 41}
    top_dishes(counts)
    assert counts == {"lemonade": 30, "margherita": 41}, f"top_dishes must not change the counts it was given, got {counts}"
