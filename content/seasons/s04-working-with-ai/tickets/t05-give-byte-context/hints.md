Read the spec in `refund_report`'s docstring line by line. You need a list of lines and a running total: go through `deliveries` and keep only the late ones.
---
Loop with `for order, delivery_minutes in deliveries:`. Work out `refund = late_refund(order, delivery_minutes)`; if it's more than 0, append `refund_line(order, delivery_minutes)` to your lines and add `refund` to the total. After the loop, handle "nothing was late" first, then add the total line and join with `"\n".join(lines)`.
---
Here is everything except the heart of the loop. Fill in the one marked line yourself:
```
lines = []
total = 0
for order, delivery_minutes in deliveries:
    refund = late_refund(order, delivery_minutes)
    # your step: if this delivery was late, add its refund_line to lines and its refund to total
if not lines:
    return "No late orders today."
lines.append(f"Total refunded: {format_price(total)}")
return "\n".join(lines)
```
