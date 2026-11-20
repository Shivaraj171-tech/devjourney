def count_dishes(orders):
    """How many of each dish: ["pizza", "tea", "pizza"] -> {'pizza': 2, 'tea': 1}."""
    counts = {}
    for dish in orders:
        counts[dish] = counts.get(dish, 0) + 1
    return counts
