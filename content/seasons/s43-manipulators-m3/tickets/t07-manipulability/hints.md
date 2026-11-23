The eigenvectors are right (the "flat along the arm" test passes) but the sizes are wrong. Check the trace test's numbers: the radii squared should add up to trace(J J^T). What do Byte's radii squared add up to?
---
The eigenvalues of J J^T are σ², the SQUARED singular values (the lesson's Step 2). Byte uses them as radii, and its manipulability is det(J J^T) = w², not w.
---
Take the square root in both places: once per radius in `velocity_ellipsoid`, once for the determinant in `manipulability`. Keep the `max(0.0, ...)` guards: rounding can make a zero eigenvalue slightly negative.
