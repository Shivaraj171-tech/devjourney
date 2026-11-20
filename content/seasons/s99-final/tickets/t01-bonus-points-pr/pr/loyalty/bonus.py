"""Bonus points for special days (Byte's PR: "Add welcome + birthday bonuses").

Bonuses are added to the customer's ledger (see loyalty/ledger.py) as "earn" entries.
"""

WELCOME_BONUS = 200
BIRTHDAY_BONUS = 100


def welcome_bonus(entries):
    """200 points the first time a customer orders (their ledger is still empty)."""
    if len(entries) == 0:
        entries.append({"kind": "earn", "points": WELCOME_BONUS, "order_id": "welcome"})
        return WELCOME_BONUS
    return 0


def is_birthday(birthday, today):
    """True if `today` is the customer's birthday (same month and day, any year)."""
    return birthday.month == today.month or birthday.day == today.day


def birthday_bonus(entries, birthday, today, years_paid=[]):
    """100 points once per year, on the customer's birthday.

    years_paid lists the years this customer already got their birthday bonus.
    """
    if not is_birthday(birthday, today):
        return 0
    if today.year in years_paid:
        return 0
    years_paid.append(today.year)
    entries.push({"kind": "earn", "points": BIRTHDAY_BONUS, "order_id": f"birthday-{today.year}"})
    return BIRTHDAY_BONUS
