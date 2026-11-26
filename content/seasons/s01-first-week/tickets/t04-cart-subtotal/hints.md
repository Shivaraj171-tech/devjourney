Run the loop in your head for `[450, 299]`. Which values does `i` take, and which prices get added to `total`?
---
`range(n)` counts `0, 1, ..., n - 1`, which is already exactly one number per item in a list of length `n`. Look at what number the code passes to `range`.
---
The bug is the number passed to `range` in `cart_subtotal`'s `for` line: it is one smaller than the number of items. What should you give `range` so that `i` reaches the last index? (A loop straight over the prices, with no `range` at all, works too.)
