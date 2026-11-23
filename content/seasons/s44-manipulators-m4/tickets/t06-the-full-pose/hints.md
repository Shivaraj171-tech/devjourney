Newton converges, so the bug hides there. Look at the failing round trip: the rotation part (the first three numbers) is right, the translation part is off. What does log_SE3 return as its translation?
---
The exponential mixes spin into slide: p = G(θ) v (the lesson's Step 3). So the log must undo G: v = G⁻¹(θ) p, and the twist is (w θ, v θ). Byte returns p itself as v θ. Near the solution that's almost the same (Step 5), which is why Newton still converges.
---
Build G⁻¹(θ) from the unit axis (the docstring has the formula: skew, its square and the identity), apply it to p, and scale by θ. Keep the θ ≈ 0 branch as it is.
