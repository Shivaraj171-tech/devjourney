**From:** Maya (Tech Lead)
**Ticket:** BUG-502: Dispatch waits too long for riders

2 a.m.: dispatch froze. Byte's first `retry_waits` had a `while` loop that never ended, so the server waited forever for nobody.
3 a.m.: Byte's hotfix. It stops. Byte called it "fixed and verified".
This morning a kitchen waited 30 seconds for a rider when the limit is 15, and the first retry came after 2 seconds instead of 1.
Fix `retry_waits` in `app/dispatch.py` so the waits match the docstring exactly. Check where the loop starts, what changes each time round, and when it stops.
