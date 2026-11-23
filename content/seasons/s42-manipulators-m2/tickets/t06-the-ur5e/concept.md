**Forward kinematics of a real 6-DOF arm: the UR5e**

**Intuition**

Six revolute joints, six DH rows, six 4x4 matrices multiplied together: nothing new compared with ticket 5, just more of it. What's new is that the table comes from a datasheet, and the numbers can look strange: negative link lengths, offsets along z where you'd expect lengths along x. They're not mistakes, they're the consequence of where the manufacturer chose to put each frame.

The UR5e is a "shoulder, elbow, three-wrist" arm. Joint 1 turns the whole arm about the vertical. Joints 2 and 3 (shoulder, elbow) have parallel horizontal axes, like ticket 3's arm. Joints 4, 5 and 6 are the wrist, each axis at 90° to the one before, but **offset** from each other by a few centimetres rather than meeting in one point (ticket 7 is about why that matters).

**The maths**

Step 1: the table (nominal values from Universal Robots' own UR5e description files, standard DH, metres):

```text
joint   a          alpha    d          (theta offsets all 0)
1       0          +90°     0.1625     base height to the shoulder
2      -0.425       0       0          upper arm
3      -0.3922      0       0          forearm
4       0          +90°     0.1333     wrist 1 offset
5       0          -90°     0.0997     wrist 2 offset
6       0           0       0.0996     wrist 3 to the tool flange
```

Step 2: why a2 and a3 are negative. a is measured along x_i, and UR put x2 and x3 pointing **backwards** along the arm. So walking -0.425 along x2 walks forwards along the other way: at home the arm lies stretched out along the base's -x axis.

Step 3: the home pose by hand. At q = 0 the arm is straight. Joints 2 and 3 walk along -x: x = a2 + a3. Row 1's twist tipped z1 to horizontal (-y), so the wrist offsets d4 and d6 run along -y and d5 runs down:

```text
x = a2 + a3            = -0.8172
y = -(d4 + d6)         = -0.2329
z = d1 - d5            =  0.0628
```

That's the home pose the tests expect: a hand check of the table, independent of any code.

Step 4: the general pose. T_0_6 = A1 A2 A3 A4 A5 A6, each Ai the DH matrix of row i with θi = qi. No closed form needed: the product IS the forward kinematics, and every prefix T_0_k = A1 ... Ak is frame k.

Step 5: nominal versus real. These are design values. Each real UR5e leaves the factory with its own calibration (slightly different a, d, α and offsets), so for real millimetre accuracy you read the robot's calibration file. Our numbers are the nominal, uncalibrated ones.

**Worked example**

The UR5e's home pose, chained from the table:

```python
import math

def dh(a, alpha, d, theta):
    ct, st, ca, sa = math.cos(theta), math.sin(theta), math.cos(alpha), math.sin(alpha)
    return [[ct, -st * ca, st * sa, a * ct], [st, ct * ca, -ct * sa, a * st], [0, sa, ca, d], [0, 0, 0, 1]]

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

UR5e = [(0, math.pi / 2, 0.1625), (-0.425, 0, 0), (-0.3922, 0, 0),
        (0, math.pi / 2, 0.1333), (0, -math.pi / 2, 0.0997), (0, 0, 0.0996)]
T = [[float(i == j) for j in range(4)] for i in range(4)]
for a, alpha, d in UR5e:
    T = mul(T, dh(a, alpha, d, 0.0))
print([round(T[i][3], 6) for i in range(3)])
# Output:
# [-0.8172, -0.2329, 0.0628]
```

**Watch out**

Datasheet tables are typed by hand into code, and typos produce robots that look plausible: a flipped sign mirrors the arm, a swapped d4/d5 tilts the wrist. Universal Robots' arms (the older CB-series UR3, UR5, UR10 and the e-Series UR3e, UR5e, UR10e, ...) share this structure with different numbers, so check the model: the older UR5's d1 is 0.089159 m, the UR5e's 0.1625 m. And check the convention: some UR documents and libraries use their own frame choices, so a table only matches its own home pose.

**AI check**

An AI will happily "recall" a robot's DH table, often mixing models or signs. Never accept it without two checks: the documented home pose (a hand calculation like Step 3) and a few random poses against an independent implementation.
