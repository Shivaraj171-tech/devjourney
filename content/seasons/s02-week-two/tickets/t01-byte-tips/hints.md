Don't skim. For each function, read the docstring first (what it promises), then check that every line keeps that promise. Try `tip_amount(2000, 15)`: how many cents should a 15% tip on $20.00 be?
---
There's one bug in each function. In `tip_amount`, check the units: is `percent` 15 or 0.15? In `total_with_tip`, the docstring says the cart "must not change". Which line changes the `prices` list?
---
Flag line 17 (`return int(subtotal_cents * percent)` never divides by 100) and line 27 (`prices.append(tip)` puts the tip into the customer's cart list). Then submit.
