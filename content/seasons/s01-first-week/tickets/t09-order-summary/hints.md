You don't need to write any new maths. Each of the four amounts can come from calling one of the functions imported at the top of the file (except `total`, which is simple arithmetic).
---
Call a function by writing its name followed by the values it needs in brackets, and store what it returns, like `count = len(prices)`. `discount_amount` needs the subtotal *and* the promo code; `delivery_fee` needs the subtotal.
---
Replace each zero with a call: `subtotal` comes from `cart_subtotal` (give it the prices), `discount` from `discount_amount` (the subtotal and the promo code) and `delivery` from `delivery_fee` (the subtotal). `total` is plain arithmetic: the subtotal, minus the discount, plus delivery.
