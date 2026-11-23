**The product of exponentials: screws and the matrix exponential**

**Intuition**

Forget link frames. Put the arm at its **home** pose (all joints at 0) and write down two things in the base frame: where the gripper is (a 4x4, M), and for each joint, its axis: a direction ω and any point q on it. That's a **screw axis**.

Now move the joints, **last joint first**. Turning joint 6 by q6 spins the gripper about joint 6's home axis. Then turn joint 5: it carries joint 6 and the gripper with it, about joint 5's home axis, which hasn't moved (only joints after it have). And so on down to joint 1. Every turn happens about an axis you measured at home, in the base frame. Written as matrices, each "turn about a screw axis" is a matrix exponential, and the arm's FK is their product:

```text
T(q) = e^([S1] q1) e^([S2] q2) ... e^([Sn] qn) M
```

**The maths**

Step 1: a turn about an axis as a velocity field. Spinning at unit speed about the axis (ω, through q), a point p moves with velocity ω × (p - q) = ω × p + v, where v = -ω × q. The pair S = (ω, v) is the screw axis (a prismatic joint: ω = 0, v = its direction). In homogeneous coordinates that's one linear equation:

```text
d/dθ [p; 1] = [S] [p; 1],      [S] = [ [ω]  v ]       [ω] = skew(ω): [ω] p = ω × p
                                     [  0   0 ]
```

Step 2: a linear equation's solution is a matrix exponential: [p(θ); 1] = e^([S] θ) [p(0); 1], with e^X = I + X + X²/2! + X³/3! + ...

Step 3: the powers. [S]^k = [[ [ω]^k, [ω]^(k-1) v ], [0, 0]]. Sum the series block by block, using [ω]³ = -[ω] for a unit ω:

```text
rotation:    I + sin θ [ω] + (1 - cos θ) [ω]²                 Rodrigues, Module 1
translation: G(θ) v,  G(θ) = I θ + (1 - cos θ) [ω] + (θ - sin θ) [ω]²
```

G collects θ, θ²/2! [ω], θ³/3! [ω]², ... : the point doesn't move in a straight line, it moves round an arc. Only for a slide (ω = 0) does G shrink to I θ and the translation become v θ.

Step 4: why the product needs only home axes. In e^([S1]q1) ... e^([Sn]qn) M, the rightmost factor acts first, while joints 1..n-1 are still at home, so Sn's home axis is the right one. Each factor to its left then moves everything already placed. No frame on any link, and no DH rules: you can read screws off a CAD drawing.

**Worked example**

A quarter turn about the vertical axis through (1, 0, 0). Where does the base origin go? (Answer by geometry: it's 1 m from the axis, so it swings round to (1, -1, 0).)

```python
import math

w, q, th = (0, 0, 1), (1, 0, 0), math.pi / 2
cross = lambda a, b: [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
v = [-c for c in cross(w, q)]
K = [[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]]
K2 = [[sum(K[i][k] * K[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
G = [[th * (i == j) + (1 - math.cos(th)) * K[i][j] + (th - math.sin(th)) * K2[i][j] for j in range(3)] for i in range(3)]
p = [sum(G[i][k] * v[k] for k in range(3)) for i in range(3)]
print(v, [round(c, 3) + 0 for c in p], [round(c * th, 3) + 0 for c in v])
# Output:
# [0, -1, 0] [1.0, -1.0, 0.0] [0.0, -1.571, 0.0]
```

G(θ) v gives the arc's end, (1, -1, 0). The slide formula v θ would push the origin 1.571 m straight along -y.

**Watch out**

The twist convention: here S = (ω, v), angular part first (Lynch and Park, and our laptop labs); some libraries store (v, ω). The point q can be ANY point on the axis: v = -ω × q comes out the same. And the formula for G assumes |ω| = 1: scale θ, not ω.

**AI check**

Test an AI's exponential with a point **on** the axis (it must stay put) and with an axis that misses the origin (the origin must move round an arc, ending at the distance it started from the axis). An exponential that only gets the rotation right passes every test through the origin.
