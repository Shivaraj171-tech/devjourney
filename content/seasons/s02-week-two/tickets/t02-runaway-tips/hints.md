You already know where the two bugs are: the lines you flagged in yesterday's review. Run the tests and match each failing check to one of them.
---
A tip of `15` means 15%, so divide by 100 and round down, just like `discount_amount` in `app/promo.py`. For the cart: a function that changes something outside itself (like the list it was given) has a *side effect*. `total_with_tip` only needs to *work out* a number, so it shouldn't touch `prices` at all.
---
In `tip_amount`, return `subtotal_cents * percent // 100`. In `total_with_tip`, delete the `prices.append(tip)` line and return `cart_subtotal(prices) + tip`.
