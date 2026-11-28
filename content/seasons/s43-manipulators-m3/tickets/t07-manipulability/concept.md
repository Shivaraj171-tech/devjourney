**Manipulability and the velocity ellipsoid**

**What a speed budget buys**

Give the joints a "speed budget": any q̇ with |q̇| ≤ 1. The gripper velocities v = J q̇ that budget can buy fill an ellipsoid (a linear map turns a ball into an ellipsoid). Its long axis is the direction the arm moves in most easily; its short axis the hardest one. Near a singularity the short axis shrinks to nothing: the ellipsoid goes flat, and moving that way costs enormous joint speed. Two numbers summarise the shape: its volume (Yoshikawa's manipulability w) and how stretched it is (the condition number κ, longest over shortest radius).

**Radii from singular values**

Step 1: which ellipsoid? With J invertible, q̇ = J⁻¹ v, so |q̇|² ≤ 1 becomes

```text
vᵀ (J Jᵀ)⁻¹ v ≤ 1
```

Step 2: its axes. J Jᵀ is symmetric, so it has orthogonal eigenvectors u_k and real eigenvalues λ_k ≥ 0. Along u_k the condition reads |v|² / λ_k ≤ 1, so the radius is

```text
r_k = sqrt(λ_k) = σ_k        (the singular values of J)
```

The eigenvalues of J Jᵀ are σ², not σ: take the square root.

Step 3: Yoshikawa's manipulability. The ellipsoid's volume is (4π/3) r1 r2 r3, so the measure is

```text
w = sqrt(det(J Jᵀ)) = σ1 σ2 σ3 = |det J|   (for a square J)
```

For a redundant arm (more joints than directions) J isn't square, but sqrt(det(J Jᵀ)) still works. That's why it's the textbook definition.

Step 4: two different questions. w falls to 0 at a singularity but also shrinks if you just scale the arm down; κ = σ_max / σ_min only measures how lopsided the ellipsoid is (1 = a ball, ∞ = flat). Here every entry of Jv is in the same unit (m/s per rad/s), so scaling the arm, or switching from metres to millimetres, scales all of Jv together and κ doesn't change. That is only true when J's rows share one unit: ticket 9's 6x6 Jacobian mixes m/s rows with rad/s rows, and there κ depends on the length unit. Ticket 9 uses κ.

Step 5: computing it without numpy. Jacobi's method repeatedly turns pairs of axes to zero the off-diagonal entries of a symmetric matrix; what's left on the diagonal are the eigenvalues, and the accumulated turns are the eigenvectors (`sym_eig`, given).

**Stretch x by 2, y by 0.5**

A 2x2 Jacobian that stretches x by 2 and y by 0.5 (and is then turned by 90°): radii and manipulability.

```python
import math

J = [[0.0, -0.5], [2.0, 0.0]]
JJt = [[sum(J[i][k] * J[j][k] for k in range(2)) for j in range(2)] for i in range(2)]
a, b, c = JJt[0][0], JJt[0][1], JJt[1][1]
mid, rad = (a + c) / 2, math.sqrt(((a - c) / 2) ** 2 + b * b)
eig = [mid + rad, mid - rad]
radii = [math.sqrt(x) for x in eig]
det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
print(eig, radii, math.sqrt(eig[0] * eig[1]), abs(det))
# Output:
# [4.0, 0.25] [2.0, 0.5] 1.0 1.0
```

The eigenvalues are 4 and 0.25; the ellipse's radii are their square roots, 2 and 0.5, and w = 2 x 0.5 = |det J|.

**λ is not the radius**

Using λ as the radius squares everything: big directions look bigger, small ones much smaller, and the ellipsoid looks flatter than it is (κ squared). Using det(J Jᵀ) without the root gives w², which is tiny when w is merely small. Both mistakes keep the eigenvectors right, so the picture points the right way and looks plausible. Check the units: radii are in m/s per rad/s, like J's entries.

**The missing square root**

"The singular values are the eigenvalues of J Jᵀ" is a sentence AIs (and people) write all the time. It's missing a square root. When you're given a formula for an ellipsoid, check one diagonal case by hand, like the worked example.
