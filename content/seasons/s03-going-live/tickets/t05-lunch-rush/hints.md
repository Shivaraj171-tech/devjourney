Look at the timings in the logs: 600 orders took 310ms, 1200 took 1240ms, 2400 took 4960ms. Doubling the orders makes it four times slower. The profiler points at line 17: what does `in` have to do with a *list* to answer "is this id in there?"
---
`order.order_id not in sent_ids` walks through `sent_ids` item by item, and it does that once for every order. A `set` answers the same question instantly. Turn `sent_ids` into a set once, before the loop, and check against the set instead.
---
Just before `to_send = []`, make a set from `sent_ids` once and give it a name. Then change the `if` line to check the order's id against that set instead of the list. Keep looping over `orders` so the result stays oldest first, and don't change either list.
