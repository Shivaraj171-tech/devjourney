You don't need to write any new maths. Each of the four amounts can come from calling one of the functions imported at the top of the file (except `total`, which is simple arithmetic).
---
Call a function by writing its name followed by the values it needs in brackets, and store what it returns: `subtotal = cart_subtotal(prices)`. `discount_amount` needs the subtotal *and* the promo code; `delivery_fee` needs the subtotal.
---
Replace the four zeros with: `subtotal = cart_subtotal(prices)`, `discount = discount_amount(subtotal, promo_code)`, `delivery = delivery_fee(subtotal)` and `total = subtotal - discount + delivery`.
