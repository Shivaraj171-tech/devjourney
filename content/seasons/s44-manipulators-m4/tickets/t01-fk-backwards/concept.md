**Inverse kinematics: forward kinematics, backwards**

**Intuition**

Forward kinematics is a function: one set of joint angles, exactly one gripper pose. Inverse kinematics asks the reverse question, and a reverse of a function doesn't have to be a function. Touch your nose: you can do it with your elbow out to the side or tucked in. Reach for something across the room: no way at all. Reach for the floor right at your feet with straight legs: exactly one way, stretched to the limit. IK answers come in all those flavours, and a robot program must handle every one: zero solutions (skip the box, or get as close as possible), one (on the edge: fragile), several (choose), infinitely many (the arm has a free choice to make).

**The maths**

Step 1: the brute-force view. Sample the joint space on a grid, run forward kinematics on every point, keep those that land near the target. That's IK at its dumbest: 72 × 72 = 5184 FK calls for a two-joint arm, and the answers come out as clusters, one cluster per solution.

Step 2: the reachable set of a two-link arm. The shoulder-to-gripper distance r is the third side of a triangle with sides l1 and l2, so the triangle inequality bounds it:

```text
|l1 - l2|  <=  r  <=  l1 + l2
```

The gripper lives in a ring (in 3D, with a turning base, a thick spherical shell).

Step 3: counting. Strictly inside the ring, the triangle can be folded two ways: the elbow on one side of the shoulder-gripper line or the other (elbow up, elbow down). On the outer edge the triangle is flat (stretched out): one solution. On the inner edge it's flat the other way (folded back): one solution. Outside: none. And if l1 = l2, the target r = 0 (the shoulder itself) is reached by folding back at ANY q1: infinitely many.

Step 4: why it matters for 6 joints. A 6-DOF arm like the UR5e has up to 8 solutions for a full pose (2 shoulders × 2 elbows × 2 wrists), and a 7-joint arm has infinitely many. Counting first tells you what the solver should return.

**Worked example**

Count the solutions for a few targets of our arm (l1 = 0.5, l2 = 0.4: the ring is 0.1 ≤ r ≤ 0.9):

```python
import math

def count(x, z, l1=0.5, l2=0.4, tol=1e-9):
    r = math.hypot(x, z)
    if r > l1 + l2 + tol or r < abs(l1 - l2) - tol:
        return 0
    if abs(r - (l1 + l2)) <= tol or abs(r - abs(l1 - l2)) <= tol:
        return 1
    return 2

print([count(*p) for p in [(0.6, 0.2), (0.9, 0.0), (0.1, 0.0), (0.05, 0.0), (1.2, 0.3)]])
# Output:
# [2, 1, 1, 0, 0]
```

**Watch out**

"Within arm's length" is only half the condition: a target too CLOSE to the shoulder is just as unreachable when the links differ in length. And the edges are knife-edges: in floating point, a target computed to be exactly at full reach can land a hair outside, so every IK solver needs a tolerance there, and every boundary case its own test.

**AI check**

Ask an AI "how many IK solutions does a 2-link arm have?" and it'll say "two". Ask it for the edge cases: inner radius, outer radius, l1 = l2 at the origin. If it can't list them, its code won't handle them.
