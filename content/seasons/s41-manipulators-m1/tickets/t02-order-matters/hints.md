Start with `matmul`. The result has as many rows as A and as many columns as B. Entry (i, j) is row i of A dotted with column j of B: `A[i][0] * B[0][j] + A[i][1] * B[1][j] + ...`. Check it on the small example in the first test by hand.
---
Once `matmul` works, look at `then`. Applying `first` and then `second` to a vector v means `second (first v)`: `first` touches v, `second` is on the outside. Matrix products regroup: second (first v) = (second first) v.
---
`matmul` is a list of rows built from three loops (or comprehensions): for each row i of A, for each column j of B, add up `A[i][k] * B[k][j]` over k. For `then`, the turn that happens FIRST must be the RIGHT-hand factor of `matmul`.
