**Module 3 on one page: velocity kinematics**

**Intuition**

Forward kinematics maps joint angles to a pose. Velocity kinematics is its derivative: at each pose a matrix, the Jacobian, turns joint speeds into gripper speeds. Everything in this module is a way of computing that matrix, checking it, or reading it. Its columns say what each joint does alone. Its rank says which motions are possible. Its singular values give the shape of the velocity ellipsoid, and its transpose carries forces back to the motors.

**The maths**

The module in seven lines:

```text
v = J(q) q̇                                   joint speeds out (linear in q̇)
J[:, i] ≈ (p(q + h e_i) - p(q - h e_i)) / 2h   the numeric Jacobian (a referee)
[Jv_i; Jw_i] = [z(i-1) × (p_e - p(i-1)); z(i-1)]   geometric, revolute joint i
[w] = Ṙ Rᵀ (base frame)     Rᵀ Ṙ (gripper frame)
J_b = Ad(T_sb⁻¹) J_s,   Ad(T) = [[R, 0], [[p]R, R]]  for twists (w, v)
radii = σ_k = sqrt(eig(J Jᵀ)),  w = σ1 σ2 ..., κ = σ_max / σ_min
τ = Jᵀ F                                       forces back (power balance)
```

Singularities: rank J drops. For the two-link arm det J = l1 l2 sin(q2) (stretched or folded). For the UR5e det J = a2 a3 sin(q3) sin(q5) (shoulder factor): the elbow, the wrist flip and the shoulder families. Near them κ explodes and resolved-rate control needs huge joint speeds.

**Worked example**

The whole chain on the two-link arm at q = (0, π/2): J, the speeds for a target velocity, the ellipse's radii and the holding torques for a 10 N push along x:

```python
import math

l1, l2, q1, q2 = 0.5, 0.4, 0.0, math.pi / 2
s1, c1, s12, c12 = math.sin(q1), math.cos(q1), math.sin(q1 + q2), math.cos(q1 + q2)
J = [[-l1 * s1 - l2 * s12, -l2 * s12], [l1 * c1 + l2 * c12, l2 * c12]]
det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
v = [0.0, 0.1]
qd = [(J[1][1] * v[0] - J[0][1] * v[1]) / det, (-J[1][0] * v[0] + J[0][0] * v[1]) / det]
tau = [J[0][0] * 10.0, J[0][1] * 10.0]
print([[round(x, 2) + 0 for x in r] for r in J], round(det, 2), [round(x, 3) + 0 for x in qd], tau)
# Output:
# [[-0.4, -0.4], [0.5, 0.0]] 0.2 [0.2, -0.2] [-4.0, -4.0]
```

Moving the gripper up (y) at 0.1 m/s needs the shoulder at +0.2 rad/s and the elbow at -0.2 rad/s; pushing with 10 N along x costs -4 N m on each joint.

**Watch out**

The module's bugs, in one list: a probe that moved the caller's list; a relative angle used as an absolute one; joint i's axis taken from frame i instead of i-1; Rᵀ Ṙ where Ṙ Rᵀ was meant; a (v, w) adjoint in a (w, v) codebase; a row swap without a sign flip; eigenvalues used as radii (twice); J where Jᵀ was meant; and a "faster" monitor that squared κ. Every one of them passed SOME test. Every one was caught by a check at a pose with every joint non-zero, or by a case solvable by hand.

**AI check**

For any Jacobian an AI hands you: ask which frame its rows are in and which twist ordering it uses, then compare it with the numeric Jacobian at a random pose. Two minutes, and it catches most of the list above.
