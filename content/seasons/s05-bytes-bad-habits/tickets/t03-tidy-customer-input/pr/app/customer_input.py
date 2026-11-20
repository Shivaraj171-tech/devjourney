"""Tidying up what customers type into the app.

Written by Byte 🤖: "Customers type messy things. These helpers clean them up."
"""

from app.promo import PROMO_CODES


def clean_code(text):
    """A promo code as typed, tidied up: '  orbit20 ' -> 'ORBIT20'."""
    return text.strip().upper()


def is_promo_code(text):
    """True if what the customer typed is one of our promo codes."""
    return clean_code(text) in PROMO_CODES


def kitchen_note(note):
    """The customer's note for the kitchen screen: 20 characters at most.

    A longer note keeps its first 17 characters and ends with '...'.
    """
    note = note.strip()
    if len(note) <= 20:
        return note
    return note[:17] + "..."


def allergy_list(text):
    """The allergies a customer typed, tidied: 'Nuts, dairy ,  GLUTEN' -> ['nuts', 'dairy', 'gluten']."""
    return text.lower().split(",", strip=True)


def local_phone(phone):
    """Drop our country code if it's there: '+1 555 010 2345' -> '555 010 2345'."""
    if phone.startswith("+1 "):
        return phone[3:]
    return phone


def rider_phone(phone):
    """What the rider sees: only the last 4 digits, '+1 555 010 2345' -> '...2345'."""
    return "..." + phone[:-4]
