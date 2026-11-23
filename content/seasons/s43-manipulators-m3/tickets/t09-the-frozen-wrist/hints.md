Compare the log's κ with Rosa's hand calculation at the frozen pose: the monitor says 200.9, Rosa's σ_max / σ_min = 2.06 / 0.145 = 14.2. And 14.2² is...? The failing test with diag(3, 1, 2) shows the same thing on a matrix you can read.
---
`singular_values` returns the eigenvalues of Jᵀ J, which are σ², not σ (the lesson's Step 1). So κ comes out squared, and the 200 threshold trips at a true κ of about 14. Byte's comment says "faster, no sqrt".
---
Take the square root of each eigenvalue in `singular_values` (keep the `max(0.0, ...)` guard for rounding). Leave the thresholds alone: they were set for the real κ.
