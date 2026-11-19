Try a round trip: `orders_from_json(orders_to_json({1001: Order(1001, "Sam")}))`. Then print the keys of what comes back. Is `1001` the same thing as `'1001'`?
---
JSON only allows text as dictionary keys, so `json.dumps` turns the key `1001` into `"1001"`, and `json.loads` gives you back the string. Saving is fine; the fix belongs in `orders_from_json`, where each `order_id` comes out of `data.items()`.
---
Inside the loop in `orders_from_json`, before the `Order(...)` line, add `order_id = int(order_id)`. Now both the dictionary key and the order's `order_id` are whole numbers again.
