**From:** Orbit Orders alerts (paging: you, on-call)
**Ticket:** INC-305: Checkout timing out during the lunch rush

INC-305 P1. 12:15, busiest day so far. Checkout timing out.
No crashes. Everything gets *slower* as the day goes on. Customers giving up.
Sofia, 12:09: kitchen screen lagging too. It asks `orders_to_send` in `app/kitchen.py` for new orders every few seconds, and checkouts queue up behind it.
Read the logs. When the number of orders doubles, how much does the time grow? The profiler (a tool that measures which line takes the time) has already found the line where the time goes.
Expected: `orders_to_send` fast at lunchtime, returning exactly what it returns now.
