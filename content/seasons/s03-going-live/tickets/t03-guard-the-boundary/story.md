**From:** Maya (Tech Lead)
**Ticket:** FEAT-303: Our own tests for free delivery

Remember Byte's small-order-fee PR, the one where a "tidy-up" quietly turned `>=` into `>`? You caught it, but only because you were reading carefully that day. Next time it might be a tired human at 6 p.m.
So let's make the computer catch it forever: from today, `team_tests/` holds tests that *we* write, and CI runs them on every pull request.
Please add tests to `team_tests/test_delivery.py` for the free-delivery rule. CI will run them against the real `delivery_fee`, where they must pass, and against a few broken versions (Byte's bug included), where at least one must fail.
You're not changing `app/delivery.py` at all today: the tests *are* the feature.
