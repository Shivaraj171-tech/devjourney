**Module 4 on one page: inverse kinematics**

**Intuition**

Inverse kinematics runs forward kinematics backwards, and the reverse of a function isn't a function: a target can have no joint solution, one, a handful, or infinitely many. Two families of methods find them. Analytic IK splits the arm into problems with closed-form answers (a triangle, a base plane, a wrist centre) and returns ALL the solutions at once, exactly. Numerical IK guesses and corrects with the Jacobian, works for any arm, returns the one solution near its guess, and needs guard rails near singularities and outside the workspace. Real controllers often use both: an analytic solver to list the candidates, joint limits and "closest to now" to choose one, and a damped numerical solver to polish it or to handle arms (offset wrists, seven joints) that have no tidy closed form.

**The maths**

The module in a few lines:

```text
ring:        |l1 - l2| <= r <= l1 + l2   (0 / 1 / 2 / ∞ solutions)
two-link:    c2 = (r² - l1² - l2²) / (2 l1 l2),  q2 = atan2(±sqrt(1 - c2²), c2)
             q1 = atan2(z, x) - atan2(l2 s2, l1 + l2 c2)     (same signed s2)
3-DOF:       q1 = atan2(y, x),  planar target (r, z - D1),  plus q1 + π with (-r, s)
wrist:       p_w = p - D6 z6,  q1..q3 from p_w,  R_3_6 = R_0_3ᵀ R  for q4..q6
Newton:      J dq = e,  e = target - p(q)        (quadratic convergence)
full pose:   J_b dq = V_b = log(T_sb⁻¹ T_sd),   v = G⁻¹(θ) p in the log
DLS:         dq = Jᵀ (J Jᵀ + λ² I)⁻¹ e          (multiplier σ / (σ² + λ²))
robust:      clamp the step by scaling: no joint moves more than MAX_STEP
choose:      within limits (both ends), then the smallest joint-space norm
```

**Worked example**

Two-link IK and one Newton correction side by side: the analytic elbow-down answer, then a Newton step from a nearby guess lands on it:

```python
import math

l1, l2, x, z = 0.5, 0.4, 0.6, 0.2
c2 = (x * x + z * z - l1 * l1 - l2 * l2) / (2 * l1 * l2)
s2 = math.sqrt(1 - c2 * c2)
exact = [math.atan2(z, x) - math.atan2(l2 * s2, l1 + l2 * c2), math.atan2(s2, c2)]
q = [exact[0] + 0.05, exact[1] - 0.05]
for _ in range(3):
    p = (l1 * math.cos(q[0]) + l2 * math.cos(q[0] + q[1]), l1 * math.sin(q[0]) + l2 * math.sin(q[0] + q[1]))
    e = (x - p[0], z - p[1])
    s1, cc1, s12, c12 = math.sin(q[0]), math.cos(q[0]), math.sin(q[0] + q[1]), math.cos(q[0] + q[1])
    J = [[-l1 * s1 - l2 * s12, -l2 * s12], [l1 * cc1 + l2 * c12, l2 * c12]]
    d = J[0][0] * J[1][1] - J[0][1] * J[1][0]
    q = [q[0] + (J[1][1] * e[0] - J[0][1] * e[1]) / d, q[1] + (-J[1][0] * e[0] + J[0][0] * e[1]) / d]
print([round(v, 6) for v in exact], [round(v, 6) for v in q])
# Output:
# [-0.362713, 1.595799] [-0.362713, 1.595799]
```

Same answer: analytic gives it at once, Newton gets there in three steps from a guess nearby.

**Watch out**

The module's bugs: edge cases miscounted (inner radius, the edges themselves); |s2| where the signed s2 belonged; a rounding-blind |c2| > 1; heights measured from the floor instead of the shoulder; a wrist centre that assumed the gripper points down; a reversed error; a log that forgot G⁻¹ (and still converged); "damping" with λ in the wrong place; a signed sum as a distance and a one-ended limit check; and a solver "optimised" by removing its guard rails. Most passed the obvious test. Edge cases and round trips (IK, then FK, compare) caught them.

**AI check**

For any IK an AI writes: run every returned solution through forward kinematics, test a target at full reach, one just beyond it and one near a singularity, and ask which solution it returns when there are several, and why.
