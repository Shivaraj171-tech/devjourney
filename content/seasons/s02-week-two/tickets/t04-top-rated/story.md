**From:** Priya (Marketing)
**Ticket:** FEAT-204: A "Top rated" badge for our best restaurants

For next month's homepage I want a **Top rated** badge on our best restaurants' cards. Byte wrote a first draft of `is_top_rated` in `app/badges.py` in about two seconds.
Maya tried it in review. A restaurant with one 5-star rating came out "top rated". The rating was from the owner's mum, I'd bet money on it.
The rule we agreed is in the docstring: at least 5 ratings **and** an average of 4.5 or more. And after Wednesday's incident, brand-new restaurants with no ratings must not crash it.
Please finish the function. If a customer orders from a "top rated" place and it's terrible, that's my name on the poster.
