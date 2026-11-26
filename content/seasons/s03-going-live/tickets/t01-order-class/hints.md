Look at how `item_count` (already done) reaches the order's list: `self.items`. Every method receives the order it was called on as `self`, so `self.items`, `self.customer` and `self.order_id` are this order's data.
---
`subtotal` can hand `self.items` to `cart_subtotal`. For `label`, a method can call another method of the same object: `self.subtotal()`, then `format_price` turns the cents into `$17.00`.
---
In `subtotal`, return what `cart_subtotal` gives for this order's own list of prices. In `label`, return an f-string in the docstring's format: the order id, the customer, and this order's subtotal (call the method on `self`) passed through `format_price`.
