Slides pass, and so would any turn about an axis through the origin (there v = 0). The failing tests all turn about an axis that misses the origin. Compare Byte's translation, `v * theta`, with the lesson's Step 3.
---
For a revolute screw the translation of e^([S] θ) is G(θ) v, with G(θ) = I θ + (1 - cos θ) [ω] + (θ - sin θ) [ω]². `skew`, `matmul` and `mat_vec` are imported; `math.sin` and `math.cos` give you the coefficients.
---
Build K = skew(w) and K2 = K K. Then build the 3x3 G entry by entry: `theta` on the diagonal, plus (1 - cos θ) K[i][j], plus (θ - sin θ) K2[i][j]. Finally return `make_T(rodrigues(w, theta), ...)`: what goes in the dots is the one product left to write.
