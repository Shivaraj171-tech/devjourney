**Analytic IK of a 3-DOF arm: split it into problems you've solved**

**Turn to face the box, then bend**

The base joint turns about the vertical, and the shoulder and elbow both bend in the vertical plane that the base points at. So the base has exactly one job: face the box. Once it does, the box lies in the arm's own vertical plane, and the shoulder and elbow see a flat two-link problem: "reach a point this far out and this high up". That's decomposition, the central trick of analytic IK: find joints whose job is separable, solve them first, and hand a smaller problem to the rest.

**The base, then the plane**

Step 1: the base. The arm's plane must contain the box (x, y, z), so it points along the box's horizontal direction:

```text
q1 = atan2(y, x)
```

Step 2: the in-plane target. In that plane, "how far out" is the horizontal distance and "how far up" is measured from the SHOULDER, which sits D1 above the base:

```text
r = sqrt(x² + y²)            s = z - D1
```

Step 3: the planar arm. Shoulder and elbow are ticket 2's two-link arm with l1 = A2, l2 = A3 (in Module 2's DH frame 1, x points out along the plane and y up, exactly the upright arm):

```text
(q2, q3) = ik_2link(r, s, A2, A3, elbow)
```

Step 4: the second base solution. Turn the base half a turn (q1 + π) and the box is now BEHIND the plane's x axis: in-plane coordinates (-r, s). The two-link arm reaches back over the shoulder. Two base choices × two elbows = four solutions; the ring condition of ticket 1 decides whether all four exist.

Step 5: the special case. If the box is right above the base (x = y = 0), atan2(0, 0) is meaningless: any q1 works. That's a shoulder singularity: infinitely many solutions, and ticket 6 of Module 3 saw it in det J.

**The box at (0.3, 0.4, 0.5)**

The box at (0.3, 0.4, 0.5), front solution, elbow up (D1 = 0.3, A2 = 0.4, A3 = 0.3), checked by forward kinematics:

```python
import math

D1, A2, A3 = 0.3, 0.4, 0.3
x, y, z = 0.3, 0.4, 0.5
q1 = math.atan2(y, x)
r, s = math.hypot(x, y), z - D1
c3 = (r * r + s * s - A2 * A2 - A3 * A3) / (2 * A2 * A3)
s3 = -math.sqrt(1 - c3 * c3)
q3 = math.atan2(s3, c3)
q2 = math.atan2(s, r) - math.atan2(A3 * s3, A2 + A3 * c3)
reach = A2 * math.cos(q2) + A3 * math.cos(q2 + q3)
height = D1 + A2 * math.sin(q2) + A3 * math.sin(q2 + q3)
print([round(v, 3) for v in (q1, q2, q3)], [round(v, 3) for v in (reach * math.cos(q1), reach * math.sin(q1), height)])
# Output:
# [0.927, 0.962, -1.403] [0.3, 0.4, 0.5]
```

**Measure from the shoulder**

Every decomposition has a reference point, and forgetting it shifts the whole answer. The planar problem lives at the SHOULDER: measure the height from the base and every solution comes out D1 too high, and targets that are in reach look out of reach (their distance from the base is bigger than their distance from the shoulder). Also, q1 + π can land outside (-π, π]: wrap it, or two equal solutions will look different.

**Three checks on an AI's 3-DOF IK**

Ask an AI for "IK of a 3-DOF arm" and check three things: where it measures the planar target from, whether it returns the back-reaching solutions, and what it does when the target is directly above the base. Then run all four answers through forward kinematics.
