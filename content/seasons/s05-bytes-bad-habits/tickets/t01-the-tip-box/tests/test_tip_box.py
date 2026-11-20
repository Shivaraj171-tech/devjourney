from app.tip_box import tip_line


def test_a_whole_number_gives_the_tip():
    line = tip_line("15", 2000)
    assert line == "Tip: $3.00", f"15% of $20.00 is $3.00, so expected 'Tip: $3.00', got {line!r}"


def test_spaces_around_the_number_are_fine():
    line = tip_line(" 20 ", 2000)
    assert line == "Tip: $4.00", f"int() ignores spaces at the ends, so ' 20 ' is 20%: expected 'Tip: $4.00', got {line!r}"


def test_a_word_gets_the_friendly_message():
    line = tip_line("ten", 2000)
    expected = 'Tip: please type a whole number, like 15 (you typed "ten")'
    assert line == expected, f"the customer typed 'ten': tell them how to fix it.\nexpected {expected!r}\ngot      {line!r}"


def test_a_percent_sign_gets_the_friendly_message():
    line = tip_line("15%", 2000)
    expected = 'Tip: please type a whole number, like 15 (you typed "15%")'
    assert line == expected, f"expected {expected!r}, got {line!r}"


def test_an_empty_box_gets_the_friendly_message():
    line = tip_line("", 2000)
    expected = 'Tip: please type a whole number, like 15 (you typed "")'
    assert line == expected, f"an empty tip box isn't a number either: expected {expected!r}, got {line!r}"


def test_a_bug_in_our_code_is_not_hidden():
    try:
        line = tip_line("15", None)
    except TypeError:
        return  # good: our own mistake crashed loudly, so it reaches the logs
    assert False, (
        f"tip_line('15', None) returned {line!r}. A missing subtotal is a bug in OUR code, "
        "and it should crash with a TypeError instead of being hidden. "
        "Only catch the ValueError that int() raises for a bad tip box."
    )
