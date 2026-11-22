**Axis-angle and Rodrigues' formula**

**Intuition**

Euler's rotation theorem: however you turn a rigid box about its centre, the final pose could have been reached by **one** turn about **one** fixed axis. Some line through the box ends up exactly where it started. So any orientation is "an axis u and an angle θ": four numbers with one constraint (|u| = 1), so three degrees of freedom, like Euler angles, but with no special order and no gimbal lock.

Grab a pen by the tip and spin it: points on the axis stay put, points off it sweep circles around it. Rodrigues' formula is just that picture written down.

**The maths**

Step 1: split any vector v into a part along the unit axis and a part across it:

```text
v_par = (u·v) u          v_perp = v - (u·v) u
```

Step 2: the parallel part doesn't move. The perpendicular part turns by θ in the plane across u. That plane has two perpendicular directions of the same length: v_perp, and u × v (which is v_perp turned 90° about u). So, exactly like the 2D turn of ticket 1:

```text
v' = v_par + cos θ · v_perp + sin θ · (u × v)
```

Step 3: write the cross product as a matrix. K = skew(u) is the matrix with K v = u × v:

```text
K = [[  0, -uz,  uy],
     [ uz,   0, -ux],
     [-uy,  ux,   0]]
```

Step 4: one more identity. u × (u × v) = (u·v) u - v = -v_perp, so K² v = -v_perp. Substitute v_perp = -K² v and v_par = v + K² v:

```text
v' = v + K²v - cos θ K²v + sin θ K v
R  = I + sin θ · K + (1 - cos θ) · K²        (Rodrigues)
```

Every step used |u| = 1 (in u × (u × v) and in "same length"). Feed it a longer axis and R stretches.

Step 5, backwards. The trace (sum of the diagonal) of R is 3 + (1 - cos θ) trace(K²) = 3 - 2(1 - cos θ) = 1 + 2 cos θ. And K is antisymmetric while I and K² are symmetric, so R - Rᵀ = 2 sin θ K:

```text
θ = acos((trace(R) - 1) / 2)          u = (R21 - R12, R02 - R20, R10 - R01) / (2 sin θ)
```

Step 6, the catch: at θ = 180°, sin θ = 0 and R - Rᵀ = 0. Use the symmetric part instead: (R + Rᵀ)/2 = cos θ I + (1 - cos θ) u uᵀ, so the diagonal gives each uᵢ² and the off-diagonals give uᵢuⱼ (and their signs). The sign of u overall doesn't matter there: 180° about u and about -u are the same turn.

**Worked example**

A third of a turn about (1, 1, 1) cycles the axes x → y → z → x:

```python
import math

u = [1 / math.sqrt(3)] * 3
t = math.radians(120)
K = [[0, -u[2], u[1]], [u[2], 0, -u[0]], [-u[1], u[0], 0]]
K2 = [[sum(K[i][k] * K[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
R = [[(i == j) + math.sin(t) * K[i][j] + (1 - math.cos(t)) * K2[i][j] for j in range(3)] for i in range(3)]
print([[round(x, 6) + 0 for x in row] for row in R])
print(round(math.degrees(math.acos((R[0][0] + R[1][1] + R[2][2] - 1) / 2)), 3))
# Output:
# [[0.0, 0.0, 1.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
# 120.0
```

Column 0 is (0, 1, 0): x went to y.

**Watch out**

Normalise the axis before building K. And never divide by sin θ near 180°: you get 0/0, which floating point turns into zeros or noise, not an error. The `+ 0` in the example turns -0.0 into 0.0 for printing; rounding also has signs.

**AI check**

Test any axis-angle code on three cases an AI tends to skip: a non-unit axis, an angle of 0, and an angle of exactly 180°. Rebuild the matrix from what comes back and compare.
