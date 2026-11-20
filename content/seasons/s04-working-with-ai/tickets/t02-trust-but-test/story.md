**From:** Maya (Tech Lead)
**Ticket:** FEAT-402: Tests before Byte's vouchers go live

Thanks for checking Byte's refund summary: Leo's FAQ now says what the code really does. Next up, late customers also get a voucher for their next order, and I wrote the rules down in SPEC-41 (it's at the top of `app/vouchers.py`).
Byte generated `late_voucher` three times this morning, and every time it said "Fixed! ✅". Attempt 3 is in `app/vouchers.py`, but I'm not merging it on Byte's word.
Please write tests in `team_tests/test_vouchers.py` straight from the spec, not from Byte's code. CI runs them against the real version and against Byte's earlier attempts: the right one must pass, the wrong ones must get caught.
