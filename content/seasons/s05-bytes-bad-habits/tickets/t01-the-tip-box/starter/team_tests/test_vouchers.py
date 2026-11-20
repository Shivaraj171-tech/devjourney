"""Our own tests for late_voucher (app/vouchers.py), written from Maya's spec.

The spec (SPEC-41):
  - 45 minutes or less: on time, no voucher (0)
  - 46 to 60 minutes:   a $3.00 voucher (300 cents)
  - more than 60:       a $5.00 voucher (500 cents)

Write the tests from the SPEC, not from Byte's code: if you copy the code's
logic into your tests, they will agree with its mistakes.

CI runs every test in this file against the real late_voucher (they must
all pass) and against other versions of it (at least one must fail).
"""

from app.vouchers import late_voucher


def test_on_time_order_gets_no_voucher():
    voucher = late_voucher(30)
    assert voucher == 0, f"a 30-minute delivery is on time and should get no voucher, got {voucher}"


def test_exactly_45_minutes_is_on_time():
    voucher = late_voucher(45)
    assert voucher == 0, f"45 minutes is still on time, so no voucher, got {voucher}"


def test_46_minutes_gets_the_small_voucher():
    voucher = late_voucher(46)
    assert voucher == 300, f"46 minutes is late: a $3.00 voucher (300), got {voucher}"


def test_exactly_60_minutes_gets_the_small_voucher():
    voucher = late_voucher(60)
    assert voucher == 300, f"60 minutes is still the $3.00 voucher (300), got {voucher}"


def test_61_minutes_gets_the_big_voucher():
    voucher = late_voucher(61)
    assert voucher == 500, f"more than 60 minutes gets a $5.00 voucher (500), got {voucher}"
