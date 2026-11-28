**Building a DH table**

**Frames first, numbers second**

A DH table is not measured, it is **derived**: first you decide where every frame goes, using a few strict rules, and then each number in the table is just a distance or an angle you can read off the drawing. If the frames are placed by the rules, four numbers per joint always suffice. If you skip the frames and "read lengths off the drawing", numbers land in the wrong columns and the arm looks fine in a sketch but not in 3D.

The key mental shift: **frame i-1 holds joint i's axis** as its z axis. The base frame's z0 is joint 1's axis, z1 is joint 2's axis, and so on. The numbers in row i describe how to get from frame i-1 to frame i.

**Placing the axes by the rules**

Step 1: draw the joint axes. Put z(i-1) along joint i's axis (for each i = 1..n), and pick the direction so the joint turns positively about it (right-hand rule).

Step 2: draw the x axes. x_i lies along the **common normal** of z(i-1) and z_i, pointing from z(i-1) towards z_i. Two special cases cover most arms: if the axes **intersect**, x_i is perpendicular to both (a_i = 0); if they are **parallel**, any common normal works, so pick the one through the joint centres (often d_i = 0).

Step 3: read the four numbers of row i:

```text
a_i  distance from z(i-1) to z_i, measured along x_i         (link length)
α_i  angle from z(i-1) to z_i, turning about x_i              (link twist)
d_i  distance from o(i-1) to x_i, measured along z(i-1)       (joint offset)
θ_i  angle from x(i-1) to x_i, turning about z(i-1)           (joint angle; offset at q = 0)
```

Step 4: check with poses you can picture. At q = 0 every frame should be where your drawing says, and moving joint i alone should turn everything after it about z(i-1). The fastest test of all: compare against an FK you already trust, at random poses.

Typical values: α = 0 for parallel axes (shoulder and elbow), α = ±90° where an axis tips over (a vertical base axis meeting a horizontal shoulder axis), α = 180° where an axis flips (a SCARA's downward slide).

**A SCARA, frame by frame**

A SCARA: two vertical hinges (links 0.4 and 0.3 m, 0.5 m up) and a slide that pushes the tool **down**. All three axes are vertical, so every a is a horizontal link length; the slide's z must point down, so row 2 twists by α = 180°. Row 3's variable is d, not θ:

```python
import math

def dh(a, alpha, d, theta):
    ct, st, ca, sa = math.cos(theta), math.sin(theta), math.cos(alpha), math.sin(alpha)
    return [[ct, -st * ca, st * sa, a * ct], [st, ct * ca, -ct * sa, a * st], [0, sa, ca, d], [0, 0, 0, 1]]

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

q1, q2, slide = math.radians(90), math.radians(-90), 0.1
rows = [(0.4, 0.0, 0.5, q1), (0.3, math.pi, 0.0, q2), (0.0, 0.0, slide, 0.0)]
T = [[float(i == j) for j in range(4)] for i in range(4)]
for row in rows:
    T = mul(T, dh(*row))
print([round(T[i][3], 2) + 0 for i in range(3)], round(T[2][2], 2))
# Output:
# [0.3, 0.4, 0.4] -1.0
```

The tool's z axis points straight down (its z component is -1), and the slide of 0.1 m took it from 0.5 down to 0.4.

**Three traps in a table**

Three traps. A link length in the **d** column (it is a distance along x, so it belongs in a). A forgotten **twist** (α = 0 where an axis tips over leaves every later axis vertical: the arm grows straight up). And sign: α is measured about x_i from z(i-1) to z_i, so flipping x_i flips α.

**Ask for the frames, not just the table**

Never accept an AI-written DH table without frames: ask for the z and x axis of every frame at q = 0, check them against the rules, then compare the table's FK against a trusted implementation at random poses.
