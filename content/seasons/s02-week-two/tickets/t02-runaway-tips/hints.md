You already know where the two bugs are: the lines you flagged in yesterday's review. Run the tests and match each failing check to one of them.
---
A tip of `15` means 15%, so divide by 100 and round down, just like `discount_amount` in `app/promo.py`. For the cart: a function that changes something outside itself (like the list it was given) has a *side effect*. `total_with_tip` only needs to *work out* a number, so it shouldn't touch `prices` at all.
---
In `tip_amount`, take the percent of the subtotal the way `discount_amount` does: multiply, then floor-divide by 100. In `total_with_tip`, delete the line that appends to `prices`, and return the cart's subtotal with the tip added on top.
