**From:** Priya (Marketing)
**Ticket:** FEAT-204: A "Top rated" badge for our best restaurants

Customers love ratings, so I'd like a 🏆 **Top rated** badge on our best restaurants' cards. Byte wrote a first draft of `is_top_rated` in `app/badges.py` in about two seconds.
But Maya spotted a problem in review: with only the average checked, a restaurant with a single 5-star rating (probably from the owner's mum 👀) would be "top rated".
The rule we agreed on is in the docstring: at least 5 ratings **and** an average of 4.5 or more. Oh, and after Wednesday's incident, please make sure brand-new restaurants can't crash it!
Please finish the function so the badge is something customers can trust.
