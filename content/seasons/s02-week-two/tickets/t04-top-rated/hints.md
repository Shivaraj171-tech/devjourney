The docstring has two conditions that must *both* be true. Byte's draft only checks one of them. How would you check how many ratings there are?
---
Python's `and` combines two conditions: `a and b` is `True` only when both are `True`. It also checks from left to right and stops at the first `False`, so if the "enough ratings" check comes first, `average_rating` never runs on an empty list.
---
Replace the return line with: `return len(ratings) >= TOP_RATED_MIN_RATINGS and average_rating(ratings) >= TOP_RATED_MIN_AVERAGE`.
