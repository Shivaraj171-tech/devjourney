Test the edge: what does `delivery_fee(2500)` return? What *should* it return according to the campaign ("$25 **or more**")?
---
The `if` line compares the subtotal with the threshold. Which comparison operator means "greater than", and which means "greater than **or equal to**"?
---
Change `>` to `>=` so an order of exactly 2500 cents also gets free delivery.
