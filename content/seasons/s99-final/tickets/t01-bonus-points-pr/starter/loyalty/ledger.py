"""The loyalty ledger: every change to a customer's points, oldest first.

Each entry is a dict:
    {"kind": "earn",   "points": 120,  "order_id": "o-501"}
    {"kind": "redeem", "points": -500, "order_id": "o-502"}
    {"kind": "expire", "points": -80,  "order_id": None}

Points are whole numbers. Earned points are positive. Redeemed and expired
points are stored as NEGATIVE numbers, so a balance is the sum of every entry.
"""


def balance(entries):
    """The customer's current points: the sum of the ledger."""
    total = 0
    for entry in entries:
        if entry["kind"] in ("earn", "redeem"):
            total += entry["points"]
    return total


def can_redeem(entries, points):
    """True if the customer has at least `points` points to spend (points > 0)."""
    return 0 < points <= balance(entries)


def redeem(entries, points, order_id):
    """Spend points on an order. Adds a redeem entry and returns the new balance."""
    if not can_redeem(entries, points):
        raise ValueError(f"not enough points: balance={balance(entries)} requested={points}")
    entries.append({"kind": "redeem", "points": -points, "order_id": order_id})
    return balance(entries)
