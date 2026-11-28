**Velocity kinematics: from joint speeds to gripper speed**

**Your hand moves faster than your shoulder**

Wave your arm with your shoulder only, slowly. Your hand moves much faster than your shoulder seems to: the same small turn moves a point far from the joint further. A robot is the same. Forward kinematics p(q) says where the gripper is; velocity kinematics asks how fast p changes when the joints turn at speeds q̇ (radians per second).

Two facts drive the whole module. First, the answer depends on WHERE the arm is: stretched out, the shoulder sweeps the gripper fast; folded in, slowly. Second, for a given pose the answer is LINEAR in the joint speeds: twice the joint speeds, twice the gripper speed; two joints together, the sum of each one alone. Linear means a matrix, and that matrix is the Jacobian.

**Velocity is a derivative**

Step 1: velocity is a derivative. The gripper is at p(q(t)), so by the chain rule

```text
v = dp/dt = (dp/dq1) q̇1 + (dp/dq2) q̇2 + ... = J(q) q̇
```

Column i of J is dp/dqi: the gripper's velocity when joint i turns alone at 1 rad/s.

Step 2: you can get it without any calculus. Move the joints a tiny step h along q̇ and run forward kinematics:

```text
forward difference:  v ≈ (p(q + h q̇) - p(q)) / h                error ~ h
central difference:  v ≈ (p(q + h q̇) - p(q - h q̇)) / (2h)       error ~ h²
```

The central difference steps both ways, so the first error terms cancel: with h = 1e-6 it is accurate to about 12 digits, while the forward one only gets about 6. The distance between the two probe points is 2h, so that's what you divide by.

Step 3: the numeric Jacobian is the same trick one joint at a time: column i uses the direction e_i (1 for joint i, 0 for the others). It needs 2n forward-kinematics calls, it works for ANY arm whose FK you can run, and it is the reference every hand-derived Jacobian in this module is tested against.

Step 4: h is a trade-off. Too big and the curve's bend spoils the slope; too small and the subtraction p(q + h) - p(q - h) loses digits to rounding (1e-6 is a good choice in double precision for lengths near a metre).

**q = (0.3, 0.9), against the exact answer**

The two-link arm (l1 = 0.5, l2 = 0.4) at q = (0.3, 0.9) with q̇ = (0.5, -0.4), against the exact derivative:

```python
import math

def tip(q):
    return (0.5 * math.cos(q[0]) + 0.4 * math.cos(q[0] + q[1]),
            0.5 * math.sin(q[0]) + 0.4 * math.sin(q[0] + q[1]))

q, qd, h = (0.3, 0.9), (0.5, -0.4), 1e-6
ahead = tip([a + h * b for a, b in zip(q, qd)])
behind = tip([a - h * b for a, b in zip(q, qd)])
v = [(a - b) / (2 * h) for a, b in zip(ahead, behind)]
w12 = qd[0] + qd[1]
exact = (-0.5 * math.sin(0.3) * qd[0] - 0.4 * math.sin(1.2) * w12,
         0.5 * math.cos(0.3) * qd[0] + 0.4 * math.cos(1.2) * w12)
print([round(x, 4) for x in v], [round(x, 4) for x in exact])
# Output:
# [-0.1112, 0.2533] [-0.1112, 0.2533]
```

Note `[a + h * b for ...]`: a NEW list for each probe point. The arm's q is never touched.

**Divide by 2h**

A numeric derivative is only as good as its probes. Three classic slips: dividing a central difference by h instead of 2h (everything twice too fast), stepping one way only (the error grows to about h), and nudging the caller's own list in place. That last one is pure Python, not maths: `q[i] += h` inside a helper changes the list the caller still uses, so the "behind" probe silently starts from the wrong place. Lists are passed by reference; build a new one.

**Questions for an AI's finite difference**

Ask an AI for "the velocity of my robot's gripper" and it will often write a forward difference with h = 0.01 and call it done. Ask instead: which difference is it, what does it divide by, does it modify my list, and does it agree with an exact derivative at one hand-checked pose?
