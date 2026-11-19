Run the loop in your head for `[450, 299]`. Which values does `i` take, and which prices get added to `total`?
---
`range(n)` counts `0, 1, ..., n - 1`, which is already exactly one number per item in a list of length `n`. Look at what number the code passes to `range`.
---
Change `range(len(prices) - 1)` to `range(len(prices))`. (An even simpler loop works too: `for price in prices:` and then `total = total + price`.)
