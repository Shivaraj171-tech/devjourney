**From:** Maya (Tech Lead)
**Ticket:** FEAT-303: Our own tests for free delivery

Byte's small-order-fee PR "tidied" `>=` into `>`. You caught it because you read carefully that day. Next time the reviewer is tired and it's 6 p.m.
So the computer catches it from now on. From today `team_tests/` holds tests that *we* write, and CI (continuous integration: the robot that runs every check on every change) runs them on every pull request.
Add tests to `team_tests/test_delivery.py` for the free-delivery rule. CI runs them against the real `delivery_fee`, where they must pass, and against a few broken versions (Byte's bug included), where at least one must fail.
You don't change `app/delivery.py` at all today. The tests *are* the feature.
