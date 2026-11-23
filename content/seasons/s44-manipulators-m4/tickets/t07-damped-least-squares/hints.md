Look at the known-matrix test: J = diag(1, 0.01). Plain Newton asks joint 2 for 100 rad to close 1 cm. What step should a damped solver take instead?
---
Byte's `dls_step` is plain Newton, `solve(J, e)`. The damped step is dq = Jᵀ (J Jᵀ + λ² I)⁻¹ e (the lesson's Step 2): add λ² to the diagonal of J Jᵀ, solve, then multiply by Jᵀ.
---
Build J Jᵀ (`matmul`, `transpose` are imported), add λ² to its diagonal, `solve` that system for e, and return Jᵀ times the result. Then watch the chart: your error should settle near 5 cm while plain Newton's keeps jumping.
