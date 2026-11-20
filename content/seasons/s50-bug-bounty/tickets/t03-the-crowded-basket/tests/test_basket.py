from basket import add_to_basket


def test_a_new_basket_has_only_its_item():
    got = add_to_basket("tea")
    assert got == ["tea"], f"a new basket should be ['tea'], got {got}"


def test_two_new_baskets_are_separate():
    first = add_to_basket("crisps")
    second = add_to_basket("cake")
    assert second == ["cake"], f"the second new basket should be ['cake'], got {second}"
    assert first == ["crisps"], f"the first basket should still be ['crisps'], got {first}"


def test_an_existing_basket_keeps_its_items():
    got = add_to_basket("cola", ["bun"])
    assert got == ["bun", "cola"], f"expected ['bun', 'cola'], got {got}"
