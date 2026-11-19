Start with `order_total`: copy the three lines that work out `total` from `receipt_email` (the correct copy) into it, and `return` the total instead of formatting it. Run the tests: the `order_total` checks should go green.
---
Now replace the maths in each message with one call: `total = order_total(order, promo_code)`. Pass the `promo_code` along, or the discount gets lost again. `loyalty_points` can return `order_total(order, promo_code) // 100` directly.
---
`order_total` body: `subtotal = order.subtotal()`, `discount = discount_amount(subtotal, promo_code)`, `return subtotal - discount + delivery_fee(subtotal)`. In `receipt_email` and `confirmation_sms`, the first line becomes `total = order_total(order, promo_code)` (delete the old maths lines); in `loyalty_points`, `return order_total(order, promo_code) // 100`.
