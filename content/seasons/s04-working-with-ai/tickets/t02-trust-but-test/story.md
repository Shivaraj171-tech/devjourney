**From:** Maya (Tech Lead)
**Ticket:** FEAT-402: Tests before Byte's vouchers go live

Leo's FAQ now says what the code really does. Thanks.
Next: late customers also get a voucher for their next order. I wrote the rules down in SPEC-41, at the top of `app/vouchers.py`.
Byte generated `late_voucher` three times this morning. Every time it said "Fixed." Attempt 3 is in `app/vouchers.py`. I'm not merging it on Byte's word.
Write tests in `team_tests/test_vouchers.py` straight from the spec, not from Byte's code. CI runs them against the real version and against Byte's earlier attempts. The right one must pass. The wrong ones must get caught.
