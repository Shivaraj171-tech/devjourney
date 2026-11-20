"""'Top today' on the home screen: the most ordered dishes so far today.

counts is a dictionary {dish name: how many were ordered today}, e.g.
{"margherita": 41, "lemonade": 30, "garlic_bread": 30}.

Written by Byte 🤖.
"""


def top_dishes(counts, n=3):
    """The n most ordered dishes as (dish, count) tuples, most ordered first.

    Dishes with the same count go in A-Z order. For example:
      top_dishes({"margherita": 41, "lemonade": 30, "garlic_bread": 30})
      -> [("margherita", 41), ("garlic_bread", 30), ("lemonade", 30)]
    """
    return sorted(counts, key=counts.get, reverse=True)[:n]


def top_banner(counts):
    """The banner, e.g. 'Top today: margherita (41), garlic_bread (30), lemonade (30)'."""
    if not counts:
        return "Top today: no orders yet"
    parts = []
    for dish, count in top_dishes(counts):
        parts.append(f"{dish} ({count})")
    return "Top today: " + ", ".join(parts)
