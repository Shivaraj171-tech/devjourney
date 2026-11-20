from loyalty.ledger import balance, can_redeem, redeem


def ledger(*pairs):
    """Build a ledger from (kind, points) pairs."""
    return [{"kind": kind, "points": points, "order_id": None} for kind, points in pairs]


def test_empty_ledger_has_zero_points():
    assert balance([]) == 0, f"a new customer has 0 points, got {balance([])}"


def test_earn_and_redeem_add_up():
    got = balance(ledger(("earn", 250), ("redeem", -100)))
    assert got == 150, f"earn 250 then redeem 100 should leave 150, got {got}"


def test_expired_points_are_gone():
    got = balance(ledger(("earn", 620), ("expire", -300)))
    assert got == 320, f"earn 620 then 300 expire should leave 320, got {got}"


def test_cannot_redeem_expired_points():
    entries = ledger(("earn", 620), ("expire", -300))
    assert not can_redeem(entries, 500), "only 320 points are left, so redeeming 500 must be refused"


def test_redeem_never_goes_negative():
    entries = ledger(("earn", 900), ("expire", -900))
    try:
        redeem(entries, 400, "o-7790")
    except ValueError:
        pass
    total = sum(entry["points"] for entry in entries)
    assert total >= 0, f"the ledger adds up to {total}: a negative balance, like customer c-2290 in the audit"


def test_redeem_still_works_with_enough_points():
    entries = ledger(("earn", 620), ("expire", -100))
    got = redeem(entries, 500, "o-8000")
    assert got == 20, f"620 - 100 expired - 500 redeemed = 20, got {got}"
