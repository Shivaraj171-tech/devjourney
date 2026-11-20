Take Byte's summary one claim at a time and find the line of code that decides it. Each claim lives in a different place: `is_late`, `late_refund` or `wrong_item_refund`.
---
For "45 minutes or more", look at the comparison in `is_late`: is it `>` or `>=`? For "food only", look at what `late_refund` takes 20% of: `order_total` comes from `app/receipts.py`, so check what that total includes.
---
`is_late(45)` is `45 > 45`, which is False, so exactly 45 minutes gets nothing. `order_total` is subtotal - discount + delivery fee, so the refund includes the delivery fee. `wrong_item_refund` returns just `item_price`, not the whole order.
