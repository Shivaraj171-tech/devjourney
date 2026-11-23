**Forward kinematics of a 3-DOF RRR arm**

**Intuition**

Almost every industrial arm starts with the same three joints. A **base** joint turns the whole arm about the vertical (yaw). A **shoulder** and an **elbow**, both with horizontal axes, swing the arm up and down inside the vertical plane the base points it into. Together they place the wrist anywhere in a thick shell around the robot: base for direction, shoulder and elbow for reach and height.

The trick is the shoulder's axis. Joint 1 turns about z0 (up), but joint 2 must turn about a horizontal axis. So the first transform does three things: lift to the shoulder height, turn by q1, and then **tip the next z axis over** with a 90° turn about x. After that, the shoulder and elbow are exactly the planar arm from ticket 2, living in a vertical plane that q1 points wherever it likes.

**The maths**

Step 1: the three link transforms, each in the frame before it:

```text
T_0_1 = Tz(d1) Rz(q1) Rx(90°)      lift, yaw, tip z1 horizontal
T_1_2 = Rz(q2) Tx(a2)              shoulder: turn, walk the upper arm
T_2_3 = Rz(q3) Tx(a3)              elbow: turn, walk the forearm
T_0_3 = T_0_1 T_1_2 T_2_3          base outwards
```

Step 2: what Rx(90°) did. It sends y to z: after it, frame 1's x axis still points horizontally (where the base faces), but frame 1's y axis points **up**. So a turn about z1 by q2 swings x1 towards up: positive q2 lifts the arm.

Step 3: read off the position. Inside frame 1, links 2 and 3 are the planar arm of ticket 2 in the x1-y1 plane:

```text
r = a2 cos q2 + a3 cos(q2 + q3)     horizontal reach (along x1)
h = a2 sin q2 + a3 sin(q2 + q3)     height above the shoulder (along y1 = up)
```

Then T_0_1 turns the reach direction by q1 and adds the shoulder height:

```text
p = (r cos q1,  r sin q1,  d1 + h)
```

Step 4: why the order matters. T_2_3 T_1_2 T_0_1 is also a valid product of three rotations and translations, so Python computes it happily. But it applies the base's yaw last, in the forearm's frame: the yaw then turns only the last bit of the arm. At home (all zeros) every rotation is the identity or the same fixed twist, and both orders land on the same point. That's why "it works at home" proves nothing.

**Worked example**

Wrist position at q = (90°, 90°, 0°) with d1 = 0.3, a2 = 0.4, a3 = 0.3, both orders:

```python
import math

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def rz(q, x=0.0, z=0.0):
    c, s = math.cos(q), math.sin(q)
    return [[c, -s, 0, x * c], [s, c, 0, x * s], [0, 0, 1, z], [0, 0, 0, 1]]

tip = [[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]]  # Rx(90°)
T01 = mul(rz(math.pi / 2, z=0.3), tip)
T12, T23 = rz(math.pi / 2, x=0.4), rz(0.0, x=0.3)
right = mul(mul(T01, T12), T23)
wrong = mul(mul(T23, T12), T01)
print([round(right[i][3], 2) + 0 for i in range(3)], [round(wrong[i][3], 2) + 0 for i in range(3)])
# Output:
# [0.0, 0.0, 1.0] [0.3, 0.4, 0.3]
```

Shoulder straight up: the wrist is 1.0 m above the base, on the vertical axis. The reversed product leaves it at shoulder height, sideways.

**Watch out**

Every product of rigid transforms is a rigid transform, so the wrong order produces a perfectly valid-looking pose: orthonormal rotation, sensible numbers, wrong place. Only a test at a pose with several joints moved catches it. Also check that the shoulder's sign convention matches yours: here positive q2 lifts.

**AI check**

When an AI says "the last transform is applied first", ask: applied first to what? In p_0 = T_0_1 T_1_2 T_2_3 p_3, the point is first expressed in frame 2, then 1, then 0: right to left in coordinates, but the chain still starts at the base. Then run a pose with all three joints non-zero.
