from receipts import mask_card


def test_shows_the_last_four_digits():
    got = mask_card("4111222233334444")
    assert got == "************4444", f"expected 12 stars then 4444, got {got!r}"


def test_keeps_the_length():
    got = mask_card("5500000000001234")
    assert len(got) == 16, f"the masked number should still be 16 characters, got {len(got)}: {got!r}"
    assert got.endswith("1234"), f"it should end with 1234, got {got!r}"
