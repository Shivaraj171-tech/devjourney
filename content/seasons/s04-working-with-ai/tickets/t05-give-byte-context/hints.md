Read the spec in `refund_report`'s docstring line by line. You need a list of lines and a running total: go through `deliveries` and keep only the late ones.
---
Loop over `deliveries`, unpacking each one into the order and its delivery minutes. Work out the refund with `late_refund`; if it's more than 0, append `refund_line(...)` for that delivery to your lines and add the refund to a running total. After the loop, handle "nothing was late" first, then add the total line and join the lines with newlines.
---
The order of the steps, in words: start an empty list of lines and a total of 0. For each delivery, get its refund; only when it's above 0, add its `refund_line` and add the refund to the total. After the loop: no lines means the spec's "nothing late" message. Otherwise add the "Total refunded" line (with `format_price`) and return the lines joined by `"\n"`.
