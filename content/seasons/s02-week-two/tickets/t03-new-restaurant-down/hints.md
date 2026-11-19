Start at the last line of the traceback: `ZeroDivisionError: division by zero`. Then look at the line just above it. Which line of `app/ratings.py` divides, and what is `len(ratings)` for a restaurant that opened today?
---
The traceback shows `rating_label` (line 19) calling `average_rating`, which divides by `len(ratings)`. `rating_label` *does* check for an empty list, but look at the order: the check comes too late, after the average has already been calculated.
---
In `rating_label`, move the `if len(ratings) == 0:` check (and its `return "New!"`) above the line `average = average_rating(ratings)`, so new restaurants return before any dividing happens.
