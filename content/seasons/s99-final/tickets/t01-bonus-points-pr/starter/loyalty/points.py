"""How many loyalty points an order earns.

The rules (from the product spec):
- 1 point per whole dollar spent. Cents are dropped: $12.99 earns 12.
- Orders under $5.00 (500 cents) earn nothing. Exactly $5.00 earns 5.
- Gold members (5000 or more lifetime points) earn double.
"""

MIN_ORDER_CENTS = 500
SILVER_LIFETIME = 1000
GOLD_LIFETIME = 5000


def tier(lifetime_points):
    """'gold', 'silver' or 'bronze' from a customer's lifetime points."""
    if lifetime_points >= GOLD_LIFETIME:
        return "gold"
    if lifetime_points >= SILVER_LIFETIME:
        return "silver"
    return "bronze"


def points_for_order(total_cents, lifetime_points):
    """Points earned by an order of `total_cents`, for a customer with `lifetime_points`."""
    if total_cents < MIN_ORDER_CENTS:
        return 0
    points = total_cents // 100
    if tier(lifetime_points) == "gold":
        points *= 2
    return points
