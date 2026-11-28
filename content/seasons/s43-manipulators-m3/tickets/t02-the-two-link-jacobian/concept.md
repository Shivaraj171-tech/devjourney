**The analytic Jacobian of a two-link arm**

**A measurement and an explanation**

The numeric Jacobian is a measurement; the analytic one is an explanation. Turn joint 1 alone and the whole arm swings around the shoulder: the gripper moves on a circle of radius |p| (its distance from the shoulder), perpendicular to the line from the shoulder. Turn joint 2 alone and only the forearm swings: a circle of radius l2 around the elbow, perpendicular to the forearm. Those two velocities are the two columns of J. When the arm is stretched out, both are perpendicular to the same line, so they are parallel: the gripper can't move along the arm at all.

**Differentiating the two-link FK**

Step 1: forward kinematics. Joint 2 is measured from the upper arm, so the forearm's direction in the base frame is the SUM q1 + q2 (write s12 = sin(q1 + q2), c12 = cos(q1 + q2)):

```text
x = l1 c1 + l2 c12
y = l1 s1 + l2 s12
```

Step 2: differentiate each line by each joint. d/dq1 of cos(q1 + q2) is -sin(q1 + q2), because q1 appears inside it too:

```text
J = [[ dx/dq1, dx/dq2 ],     = [[ -l1 s1 - l2 s12,   -l2 s12 ],
     [ dy/dq1, dy/dq2 ]]        [  l1 c1 + l2 c12,    l2 c12 ]]
```

Step 3: read the columns. Column 2 is l2 (-s12, c12): length l2, perpendicular to the forearm. Column 1 is (-y, x): the gripper position turned by 90°, perpendicular to the shoulder-to-gripper line, as the intuition said.

Step 4: the determinant. Multiplying out, the l2² terms cancel and so do the cross terms:

```text
det J = l1 l2 (c1 s12 - s1 c12) = l1 l2 sin(q2)
```

It does not depend on q1 at all (turning the whole arm changes nothing about its shape), and it is zero exactly when sin(q2) = 0: stretched out (q2 = 0) or folded back (q2 = π). Those are the arm's singularities.

Step 5: what the matrix buys you. v = J q̇ costs four multiplications instead of four forward-kinematics runs, J's columns explain the motion, and det J warns you before trouble.

**J at (0.3, 0.9) and its determinant**

The analytic J at q = (0.3, 0.9) and its determinant, checked against l1 l2 sin(q2):

```python
import math

l1, l2, q1, q2 = 0.5, 0.4, 0.3, 0.9
s1, c1 = math.sin(q1), math.cos(q1)
s12, c12 = math.sin(q1 + q2), math.cos(q1 + q2)
J = [[-l1 * s1 - l2 * s12, -l2 * s12], [l1 * c1 + l2 * c12, l2 * c12]]
det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
print([[round(x, 4) for x in row] for row in J])
print(round(det, 5), round(l1 * l2 * math.sin(q2), 5))
# Output:
# [[-0.5206, -0.3728], [0.6226, 0.1449]]
# 0.15667 0.15667
```

Those are the same numbers ticket 1's numeric Jacobian gives at this pose.

**q1 + q2, not q2**

Relative angles are the classic trap: the forearm's direction is q1 + q2, not q2. A Jacobian written with sin(q2) instead of sin(q1 + q2) agrees with the truth whenever q1 = 0, which is exactly the pose people test first. Test at several poses, including ones with every joint non-zero. And keep the chain rule in mind: q1 appears inside every "12" term, so the first column always collects terms from BOTH links.

**Three random poses, not home**

An AI's hand-derived Jacobian is a claim; the numeric Jacobian is evidence. Compare them at three random poses, not at the home pose, and check one structural fact you can derive in your head, such as det J = l1 l2 sin(q2).
