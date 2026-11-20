Copy the shape of `test_on_time_order_gets_no_voucher` for each line of the spec: pick a number of minutes, and write the voucher the SPEC says it should get.
---
The spec has two edges, 45 and 60 minutes, and that's where wrong versions hide. Test right on each edge (45 and 60) and just past it (46 and 61), so a `>=` where a `>` belongs gets caught.
---
Add four tests: `late_voucher(45) == 0`, `late_voucher(46) == 300`, `late_voucher(60) == 300` and `late_voucher(61) == 500`, each in its own `def test_...():` with a helpful assert message. Don't change `app/vouchers.py`.
