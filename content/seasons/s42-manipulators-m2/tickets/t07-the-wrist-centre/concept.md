**Wrist geometry: the spherical wrist and its centre**

**Intuition**

Hold your forearm still and move only your wrist: your hand turns, but one point inside your wrist stays put. Most industrial arms copy that: their last three joints (often called roll, pitch, roll) have axes that **intersect at one point**, the wrist centre. That's a **spherical wrist**: the hand can take any orientation, like a ball joint, while the wrist centre stays fixed.

That gives the robot a clean division of labour. The first three joints (base, shoulder, elbow) decide **where the wrist centre is**: position. The last three decide **which way the gripper faces** about it: orientation. Six DOF, split three plus three. Forward kinematics doesn't need this, but it is why inverse kinematics of such arms has a closed form (Module 4): find the wrist centre from the target, solve the arm for it, then solve the wrist for the orientation.

The UR5 is a counter-example: its wrist axes are offset by d5 (and d4, d6) and never meet. Its IK still has a closed form, but a messier one.

**The maths**

Step 1: the wrist centre p_w is the point where z3, z4 and z5 meet. In the DH table of a spherical wrist, rows 4 and 5 have a = 0 and d5 = 0, so frames 4 and 5 both sit at that point: p_w = o4 = o5. Row 6's d6 is the distance from the wrist centre out to the flange, along z5 = z6.

Step 2: from the gripper's pose back to the wrist centre. The flange is d6 further along its own approach axis z6:

```text
p_flange = p_w + d6 z6     =>     p_w = p_flange - d6 z6
```

Step 3: where is z6 in T_0_6? It's the flange's z axis written in the base frame: the **third column** of the rotation part, (R[0][2], R[1][2], R[2][2]). Module 1's rule still holds: the columns are the turned axes. The third **row** is something else entirely: the z components of x6, y6 and z6.

Step 4: why the wrist joints can't move p_w. T_3_4 = Rz(θ4) Tz(d4) Rx(α4): its origin is d4 along z3 whatever θ4 is. Frames 5 and 6 only turn about axes through that same point. So:

```text
p_w = T_0_3(q1, q2, q3) (0, 0, d4)       depends on q1, q2, q3 only
```

That's the decoupling, in one line: three joints for position, three for orientation.

**Worked example**

Row or column? A flange pose with the gripper pointing straight down at (0.5, 0.2, 0.3), d6 = 0.1, and the gripper's x axis turned along y:

```python
R = [[0, 1, 0],
     [1, 0, 0],
     [0, 0, -1]]   # columns: x6 = (0, 1, 0), y6 = (1, 0, 0), z6 = (0, 0, -1)
p, d6 = [0.5, 0.2, 0.3], 0.1
z_col = [R[0][2], R[1][2], R[2][2]]
z_row = R[2]
print([round(p[i] - d6 * z_col[i], 2) for i in range(3)], [round(p[i] - d6 * z_row[i], 2) for i in range(3)])
# Output:
# [0.5, 0.2, 0.4] [0.5, 0.2, 0.4]
```

Both agree here, because this R happens to be symmetric. Tilt the gripper in any less special way and they don't: a test at a symmetric pose (like home) can pass with the row. That is the lesson of this ticket's bug.

**Watch out**

Row-versus-column bugs survive any test that uses identity-like or symmetric rotations: home poses, quarter turns about a single axis. Also, d6 is the wrist-centre-to-flange distance only; if a gripper is mounted on the flange, the tool length is added on top (ticket 10).

**AI check**

When AI code pulls an axis out of a rotation matrix, check: is it indexing `R[i][2]` over i (a column: an axis) or `R[2]` (a row)? Then test at a random, unsymmetric pose, and check the property that must hold: moving only joints 4-6 must not move the wrist centre.
