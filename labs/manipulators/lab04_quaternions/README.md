# Lab 04 · Quaternions

Module 1 · 120 XP · browser twin: Module 1, "Quaternions"

## Intuition

A rotation matrix uses 9 numbers for 3 degrees of freedom and drifts. A rotation
vector has 3 numbers but a nasty spot at θ = π. A **unit quaternion** uses 4
numbers with one smooth constraint (|q| = 1): no singularities, cheap to
compose, trivial to renormalise, and it interpolates beautifully. That's why
MuJoCo (`data.xquat`), ROS (`geometry_msgs/Quaternion`), IMUs and most RL
observation spaces use them.

Picture the unit sphere in 4D. Every rotation is a pair of antipodal points
(q and −q: the **double cover**). Interpolating two orientations = walking along
the great circle between them: that's **slerp**.

**Convention matters.** This lab uses `q = [w, x, y, z]` (scalar first), like
MuJoCo. ROS, Eigen's `coeffs()` and SciPy use `[x, y, z, w]`. Mixing them up is
the #1 quaternion bug in practice.

## Key maths, step by step

**1. Definition.** q = w + x i + y j + z k with i² = j² = k² = ijk = −1, which gives
ij = k, jk = i, ki = j and ji = −k (non-commutative!). Write q = (w, v).

**2. Product.** Expand (w₁ + v₁)(w₂ + v₂) with the rules above. For pure vectors,
the product of vectors is uv = −u·v + u×v, so

    (w₁, v₁)(w₂, v₂) = (w₁w₂ − v₁·v₂,   w₁v₂ + w₂v₁ + v₁×v₂)

**3. Rotation.** For a unit axis k̂ and angle θ, q = (cos θ/2, sin θ/2 · k̂). A vector
v rotates by the sandwich v' = q (0, v) q*, where q* = (w, −v) is the conjugate
(= inverse for |q| = 1). The **half angle** appears because q is applied twice.
Consequence: q and −q give the same v', and turning by 2π gives q = −1, not +1.

**4. To a matrix.** Expanding the sandwich for each basis vector:

    R = [[1−2(y²+z²), 2(xy−wz),   2(xz+wy)],
         [2(xy+wz),   1−2(x²+z²), 2(yz−wx)],
         [2(xz−wy),   2(yz+wx),   1−2(x²+y²)]]

Composition: R(q₁q₂) = R(q₁) R(q₂).

**5. From a matrix (Shepperd).** From step 4: tr R = 4w² − 1, R₀₀ = 2x² + 2w² − 1 + …,
so 4w² = 1 + tr R, 4x² = 1 + R₀₀ − R₁₁ − R₂₂, and similarly for y, z. The
off-diagonals give products: R₂₁ − R₁₂ = 4wx, R₁₀ + R₀₁ = 4xy, etc. Recover the
*largest* of w, x, y, z from its square root, then the other three by dividing
the products by it. Dividing by the largest keeps it numerically safe (the naive
"w first" formula fails at 180° turns, where w = 0).

**6. Slerp.** For unit q₀, q₁ with cos Ω = q₀·q₁, the great-circle point at fraction t is

    slerp(q₀, q₁, t) = [sin((1−t)Ω) q₀ + sin(tΩ) q₁] / sin Ω

(derive it by writing the point as a q₀ + b q₁, requiring unit length and angle tΩ
from q₀). Two traps: if q₀·q₁ < 0, replace q₁ by −q₁ (same rotation, shorter
arc); if Ω ≈ 0, sin Ω ≈ 0, so use normalised linear interpolation.

## Task

Implement all eight functions in `starter.py`.

    python -m labs.manipulators check lab04
    python -m labs.manipulators visual lab04   # slerp vs naive Euler interpolation

If MuJoCo is installed, one test compares your product with `mujoco.mju_mulQuat`.
