Start with `order_total`: copy the three lines that work out `total` from `receipt_email` (the correct copy) into it, and `return` the total instead of formatting it. Run the tests: the `order_total` checks should go green.
---
Now replace the maths in each message with one call to `order_total`, storing its result in `total`. Pass the `promo_code` along, or the discount gets lost again. `loyalty_points` can floor-divide `order_total`'s result by 100 directly.
---
`order_total` needs three steps: the order's subtotal, the discount for that subtotal and promo code, and the subtotal minus the discount plus the delivery fee on the subtotal. In `receipt_email` and `confirmation_sms`, swap the old maths lines for the one `order_total` call; in `loyalty_points`, return its result floor-divided by 100.
