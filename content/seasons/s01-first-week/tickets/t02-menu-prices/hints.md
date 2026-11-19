Try it by hand: `format_price(1250)` should give `"$12.50"`. What does the code actually give, and how far off is it?
---
The price is in **cents**. How many cents are in one dollar? Compare that with the number the code divides by.
---
There are 100 cents in a dollar, so the line should be `dollars = cents / 100`.
