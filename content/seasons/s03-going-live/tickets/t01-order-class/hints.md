Look at how `add_item` reaches the order's list: `self.items`. Every method receives the order it was called on as `self`, so `self.items`, `self.customer` and `self.order_id` are this order's data.
---
`item_count` is the length of `self.items`. `subtotal` can hand `self.items` to `cart_subtotal`. For `label`, a method can call another method of the same object: `self.subtotal()`, then `format_price` turns the cents into `$17.00`.
---
`return len(self.items)`, then `return cart_subtotal(self.items)`, then `return f"Order {self.order_id} for {self.customer}: {format_price(self.subtotal())}"`.
