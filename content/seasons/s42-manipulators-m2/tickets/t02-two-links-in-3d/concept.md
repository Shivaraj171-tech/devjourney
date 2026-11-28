**Forward kinematics by composing transforms**

**Every part of the arm, joint by joint**

Forward kinematics (FK) answers one question: given every joint's value, where is each part of the arm, and which way does it face? The answer is not a new formula per robot. It is one recipe:

1. Attach a frame to each link.
2. Write the transform from each link's frame to the next one's: it depends only on the joint between them.
3. Multiply them from the base outwards.

Imagine walking along the arm with a compass. At the shoulder, you turn by q1, then walk l1 along the direction you now face. At the elbow you turn by q2 **relative to the way you were already facing**, then walk l2. You never need to know a global angle: each step is described in your own, current frame. That's why the transforms multiply on the right (Module 1, ticket 9: moving frames post-multiply).

**Turn, then walk the turned x axis**

Step 1: one joint and its link. Turn about the joint's z axis, then walk along the **turned** x axis:

```text
T_(i-1)_i = Rz(q_i) Tx(l_i) = [ cos q  -sin q  0  l cos q ]
                              [ sin q   cos q  0  l sin q ]
                              [   0       0    1     0    ]
                              [   0       0    0     1    ]
```

Step 2: the chain. Touching names cancel:

```text
T_0_1 = Rz(q1) Tx(l1)
T_0_2 = T_0_1 T_1_2 = Rz(q1) Tx(l1) Rz(q2) Tx(l2)
```

Step 3: check it against the trigonometry you know. The translation column of T_0_2 is T_0_1's origin plus T_0_1's rotation applied to (l2 cos q2, l2 sin q2, 0). A rotation by q1 turns an angle q2 into q1 + q2:

```text
x = l1 cos q1 + l2 cos(q1 + q2)
y = l1 sin q1 + l2 sin(q1 + q2)
```

The matrices did the angle-adding for us. And they keep doing it when the axes are not all parallel, which is where trigonometry by hand gets hopeless.

Step 4: every frame, not just the tip. The frame of joint k in the base is the **running product** T_0_k = T_0_1 T_1_2 ... T_(k-1)_k. One loop computes them all: keep a running T, multiply each link onto its right, and save a copy after each step. Drawing, collision checks and the Jacobian (Module 3) all need these intermediate frames.

**90° and 90°, folded back**

The arm with l1 = 0.5, l2 = 0.4 at q1 = 90°, q2 = 90°: the upper arm points along y, the forearm folds back along -x.

```python
import math

def link(q, l):
    c, s = math.cos(q), math.sin(q)
    return [[c, -s, 0, l * c], [s, c, 0, l * s], [0, 0, 1, 0], [0, 0, 0, 1]]

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

T, frames = [[float(i == j) for j in range(4)] for i in range(4)], []
for q, l in [(math.pi / 2, 0.5), (math.pi / 2, 0.4)]:
    T = mul(T, link(q, l))
    frames.append([round(T[r][3], 3) + 0 for r in range(3)])
print(frames)
# Output:
# [[0.0, 0.5, 0.0], [-0.4, 0.5, 0.0]]
```

The elbow is at (0, 0.5, 0) and the tip at (-0.4, 0.5, 0): the trigonometry agrees, since cos 180° = -1.

**Link transform or running product**

Saving the link transform instead of the running product looks right for the first joint (T_0_1 is both) and wrong for every joint after it. That is exactly why a test that only checks the elbow passes on broken code. Also: saving the running T itself, not a copy, is only safe because `T_mul` returns a new matrix each time.

**A pose you can draw, every frame**

When an AI gives you FK, test a pose you can draw by hand where the joints don't cancel out, such as 90° and 90°. Then compare every intermediate frame, not just the tip.
