**The Denavit-Hartenberg convention**

**Intuition**

A general rigid transform needs six numbers. Denavit and Hartenberg noticed that if you are clever about **where you put each link's frame**, four are enough. The rules: frame i's z axis lies along joint i+1's axis, and frame i's x axis lies along the **common normal**, the shortest line between the joint axes z(i-1) and z(i). With frames placed like that, getting from one frame to the next is always the same four moves:

1. **θ** (theta): turn about the old z axis until the old x lines up with the common normal. For a revolute joint this is the joint angle.
2. **d**: slide along the old z axis to the common normal. For a prismatic joint this is the joint variable.
3. **a**: walk along the common normal (the new x axis) to the next joint's axis. The link's "length".
4. **α** (alpha): twist about that new x axis until the old z lines up with the new joint's axis. The link's "twist".

Two parameters are about the joint (θ, d: along and about z), two about the link (a, α: along and about x). One table row per joint, and the whole robot is a table.

**The maths**

Step 1: the four moves as matrices, each in the frame produced by the move before (so they post-multiply):

```text
T_(i-1)_i = Rz(θ_i) Tz(d_i) Tx(a_i) Rx(α_i)
```

Step 2: multiply it out (c = cos, s = sin):

```text
[ cθ   -sθ cα    sθ sα   a cθ ]
[ sθ    cθ cα   -cθ sα   a sθ ]
[ 0       sα       cα      d  ]
[ 0       0        0       1  ]
```

Read it: the first column is the new x axis (θ turned it in the old x-y plane), the last column is where the new origin is (a along the turned x, d up z).

Step 3: reading a table. A row is (a, α, d, θ_offset) in this module and in our laptop labs; joint i's actual angle is θ_i = q_i + θ_offset_i. The column order is a **convention**: other books print θ, d, a, α. Always read the header.

Step 4: Rz and Tz commute (both along z), and so do Tx and Rx (both along x), so you may meet "Tz(d) Rz(θ) Rx(α) Tx(a)": the same matrix. But a z-move and an x-move do NOT commute: the pairs must stay in that order.

**Worked example**

A two-link arm on a 0.2 m pedestal, as a table. Row 1 lifts 0.2 (d) and walks 0.5 (a); row 2 walks 0.4:

```python
import math

def dh(a, alpha, d, theta):
    ct, st, ca, sa = math.cos(theta), math.sin(theta), math.cos(alpha), math.sin(alpha)
    return [[ct, -st * ca, st * sa, a * ct], [st, ct * ca, -ct * sa, a * st], [0, sa, ca, d], [0, 0, 0, 1]]

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

table = [(0.5, 0.0, 0.2, 0.0), (0.4, 0.0, 0.0, 0.0)]
T = [[float(i == j) for j in range(4)] for i in range(4)]
for (a, alpha, d, offset), q in zip(table, [math.pi / 2, -math.pi / 2]):
    T = mul(T, dh(a, alpha, d, q + offset))
print([round(T[i][3], 2) + 0 for i in range(3)])
# Output:
# [0.4, 0.5, 0.2]
```

Joint 1 at 90° points the upper arm along y; joint 2 at -90° turns the forearm back to x. The pedestal height comes from d.

**Watch out**

The classic off-by-one: unpacking a row in the wrong column order. If d and θ_offset swap, a 0.2 m pedestal becomes a 0.2 rad turn (about 11°) and the arm sits on the floor, and nothing crashes. Second trap: **modified DH** (Craig's book) puts Rx(α_(i-1)) Tx(a_(i-1)) BEFORE Rz(θ_i) Tz(d_i), and its tables are shifted by one row. A table only means something with its convention.

**AI check**

Ask which convention and which column order an AI's DH code uses, then test with a row where only one parameter is non-zero (each must give a pure move) and with a row where all four are: only that catches the wrong move order.
