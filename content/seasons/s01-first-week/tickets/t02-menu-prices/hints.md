Try it by hand: `format_price(1250)` should give `"$12.50"`. What does the code actually give, and how far off is it?
---
The price is in **cents**. How many cents are in one dollar? Compare that with the number the code divides by.
---
There are 100 cents in a dollar. The only thing to change is the number the `dollars = ...` line in `format_price` divides by. Leave the `:.2f` line as it is: it already shows two decimals.
