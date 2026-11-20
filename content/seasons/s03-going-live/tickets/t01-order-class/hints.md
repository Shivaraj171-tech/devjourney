Look at how `item_count` (already done) reaches the order's list: `self.items`. Every method receives the order it was called on as `self`, so `self.items`, `self.customer` and `self.order_id` are this order's data.
---
`subtotal` can hand `self.items` to `cart_subtotal`. For `label`, a method can call another method of the same object: `self.subtotal()`, then `format_price` turns the cents into `$17.00`.
---
In `subtotal`: `return cart_subtotal(self.items)`. In `label`: `return f"Order {self.order_id} for {self.customer}: {format_price(self.subtotal())}"`.
