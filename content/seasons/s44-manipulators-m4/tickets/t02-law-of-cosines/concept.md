**Analytic IK of a two-link arm**

**Intuition**

Shoulder, elbow and gripper form a triangle whose three sides you know: the two links and the distance to the target. Three sides pin down a triangle's angles (school geometry: the law of cosines), so they pin down the elbow's bend. Then the shoulder has to point the whole folded arm at the target: the direction to the target, corrected by the angle the bent forearm adds. The only choice left is which way to fold, and that sign is the whole difference between elbow up and elbow down.

**The maths**

Step 1: the elbow. Forward kinematics says the gripper's squared distance from the shoulder is

```text
r² = x² + z² = l1² + l2² + 2 l1 l2 cos(q2)
c2 = cos(q2) = (r² - l1² - l2²) / (2 l1 l2)
```

|c2| > 1 means no triangle: out of reach (ticket 1's ring, in another form).

Step 2: the sign. cos(q2) = c2 has two answers, ±acos(c2). Write s2 = ±sqrt(1 - c2²) and q2 = atan2(s2, c2): the sign of s2 IS the elbow choice. With x forward and z up, a negative q2 folds the forearm clockwise and lifts the elbow above the shoulder-target line: elbow up.

Step 3: the shoulder. The target is at angle atan2(z, x) from the shoulder. The folded arm, seen from the shoulder, points at an extra angle β where the bent forearm adds (l2 c2, l2 s2) to the upper arm's (l1, 0):

```text
β = atan2(l2 s2, l1 + l2 c2)          q1 = atan2(z, x) - β
```

Use the SAME s2, with its sign, in β: elbow up and elbow down need different shoulder angles.

Step 4: why atan2. atan(y/x) loses the quadrant (and divides by zero straight up); atan2(y, x) uses both signs and returns the true angle in (-π, π].

Step 5: the edge. On full reach, c2 = 1 exactly in theory, but floating point can compute 1.0000000000000002. A strict |c2| > 1 test then calls a reachable box unreachable, and sqrt(1 - c2²) raises a math domain error. Accept a tiny tolerance and clamp c2 into [-1, 1].

**Worked example**

The box at (0.6, 0.2), both elbows, checked by forward kinematics:

```python
import math

l1, l2, x, z = 0.5, 0.4, 0.6, 0.2
c2 = (x * x + z * z - l1 * l1 - l2 * l2) / (2 * l1 * l2)
for name, s2 in (("up", -math.sqrt(1 - c2 * c2)), ("down", math.sqrt(1 - c2 * c2))):
    q2 = math.atan2(s2, c2)
    q1 = math.atan2(z, x) - math.atan2(l2 * s2, l1 + l2 * c2)
    tip = (l1 * math.cos(q1) + l2 * math.cos(q1 + q2), l1 * math.sin(q1) + l2 * math.sin(q1 + q2))
    print(name, round(q1, 3), round(q2, 3), [round(v, 3) for v in tip])
# Output:
# up 1.006 -1.596 [0.6, 0.2]
# down -0.363 1.596 [0.6, 0.2]
```

Same elbow bend, opposite signs; the shoulder angles differ by 1.37 rad.

**Watch out**

Two classic slips. Using |s2| in β (or forgetting the sign entirely) gives the elbow-down shoulder angle to the elbow-up bend: the arm lands somewhere else, and only one of the two elbows is ever tested. And comparing floats at an edge with no tolerance: c2 computed from a measured target is never exactly 1.

**AI check**

AI-written two-link IK is everywhere and often copied from a source with y up, angles measured from a different axis or "elbow up" meaning the opposite sign. Check every solution by plugging it into forward kinematics, for BOTH elbows, and for a target exactly at full reach.
