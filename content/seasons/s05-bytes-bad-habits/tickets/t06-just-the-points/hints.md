Read Priya's request at the top of `app/loyalty.py`, then go through `points_message` line by line. For each line ask: which part of the request is this for? Make a list of the lines with no answer.
---
Byte added three extras: weekend doubling (the `weekday` parameter and `WEEKEND_...` constants), a welcome bonus (`WELCOME_BONUS`, plus the `customers_seen` list, which remembers customers between calls, so the same order earns different points the second time) and the "WOW!" wording. All three come out, constants included.
---
What's left is two lines in the function body: the first gets `points` from `loyalty_points(order, promo_code)`, the second returns the message. Write the return line yourself, in the exact words of Priya's example.
