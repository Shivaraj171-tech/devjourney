**From:** Orbit Orders alerts 🚨 (paging: you, on-call)
**Ticket:** INC-305: Checkout timing out during the lunch rush

It's 12:15 on our busiest day yet, and checkout is timing out. 🍕 Nothing is crashing: everything just gets *slower* as the day goes on, and customers are giving up.
Sofia noticed the kitchen screen lagging too: it asks `orders_to_send` in `app/kitchen.py` for new orders every few seconds, and checkouts queue up behind it.
Read the logs: when the number of orders doubles, how much does the time grow? The profiler (a tool that measures which line takes the time) has already found the line where the time goes.
Make `orders_to_send` fast at lunchtime without changing what it returns.
