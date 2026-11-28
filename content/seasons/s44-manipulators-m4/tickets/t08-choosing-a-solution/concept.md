**Choosing among IK solutions: limits first, then the shortest move**

**Options, and the one the robot takes**

IK gives you options; the robot can only take one. The choice is not cosmetic: pick the wrong one and the arm swings through half the workspace to reach a box right under its gripper, sweeping everything in between. Two rules cover most real systems. Hard constraints first: a solution outside a joint's range is not a solution (cables, hard stops, the arm's own body). Then preference: of the allowed ones, the one the arm can reach with the least joint motion, because small motions are fast, predictable and unlikely to hit anything.

**Limits, then distance**

Step 1: joint limits. Each joint has a range [low_i, high_i]. A candidate q is allowed only if every joint is inside its range:

```text
allowed(q) = all(low_i <= q_i <= high_i)      BOTH ends, EVERY joint
```

Step 2: distance in joint space. How far is candidate q from the current q_now? Joint motions in opposite directions don't cancel: moving joint 1 by +1 rad and joint 2 by -1 rad is two radians of motion, not zero. Use a norm:

```text
d(q, q_now) = sqrt(Σ (q_i - now_i)²)         (or Σ w_i (q_i - now_i)² with weights)
```

Weights let you prefer moving the light wrist joints over the heavy base. The infinity norm max |q_i - now_i| estimates the move's duration when all joints move at the same top speed.

Step 3: pick. Filter by Step 1, minimise Step 2; if nothing is allowed, say so (return None) rather than guess.

Step 4: wrapping. For a joint that can turn freely (no hard stop), q and q + 2π are the same pose: compare wrapped differences. For a joint WITH limits, don't wrap: going from 170° to -170° really is 340° of travel through the stops.

**Four solutions, one shoulder limit**

Four solutions for a box, the arm just above it (elbow down), and the shoulder limited to [-0.5, 2.0]:

```python
import math

now = [0.9, -0.1, 1.2]
limits = [(-math.pi, math.pi), (-0.5, 2.0), (-2.6, 2.6)]
sols = {"front up": [0.93, 0.96, -1.40], "front down": [0.93, -0.20, 1.40],
        "back up": [-2.21, -2.94, -1.40], "back down": [-2.21, 2.18, 1.40]}
for name, q in sols.items():
    ok = all(lo <= x <= hi for x, (lo, hi) in zip(q, limits))
    d = math.sqrt(sum((a - b) ** 2 for a, b in zip(q, now)))
    signed = sum(a - b for a, b in zip(q, now))
    print(name, ok, round(d, 2), round(signed, 2))
# Output:
# front up True 2.81 -1.51
# front down True 0.23 0.13
# back up False 4.95 -8.55
# back down False 3.86 -0.63
```

The real distance picks "front down" (0.23 rad away). The signed sum would rank "back up" first (-8.55: the "smallest" number is the biggest move), and an upper-limit-blind check would allow "back down".

**Sums that cancel, limits half-checked**

Two bugs that read like features: "total joint travel" as a plain sum (negatives cancel and win the min), and a limits check that only tests the end you thought of. Both pass a test where every difference happens to be positive and every candidate happens to be below its upper limit.

**Is it a norm, and does it wrap?**

When an AI writes "pick the closest IK solution", look at the distance: is it a norm (squares or absolute values), and does it wrap joints that shouldn't be wrapped? Then test with a candidate whose differences have mixed signs.
