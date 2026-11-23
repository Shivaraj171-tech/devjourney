**The geometric Jacobian: one cross product per joint**

**Intuition**

Spin a bicycle wheel: a point on the rim moves perpendicular to both the axle and the spoke, at speed (angular speed) × (radius). In vectors that's v = ω × r. A revolute joint is an axle. When joint i turns alone at 1 rad/s, everything beyond it, the gripper included, spins rigidly about that joint's axis. So the gripper's velocity is the axis crossed with the vector from a point on the axis to the gripper, and its angular velocity is simply the axis itself. No calculus, no trigonometry: just the frames forward kinematics already gives you.

**The maths**

Step 1: which axis? In standard DH, row i's transform is Rz(θi) ...: joint i turns about the z axis of the frame BEFORE it, z(i-1), through that frame's origin p(i-1). With the frames list [T_0_0 = I, T_0_1, ..., T_0_n], joint i's axis is the third column of frames[i - 1].

Step 2: the column. With p_e the gripper's position:

```text
Jv_i = z(i-1) × (p_e - p(i-1))       linear velocity of the gripper point
Jw_i = z(i-1)                         angular velocity of the gripper
```

Any point on the axis works for the radius (moving it along z(i-1) adds a vector parallel to z(i-1), whose cross product with z(i-1) is zero).

Step 3: stack the columns. J = [Jv; Jw] is 6 × n: three rows of linear velocity on top, three of angular velocity below, all in the base frame. For our 3-DOF arm: 6 × 3.

Step 4: the prismatic case, for completeness. A sliding joint moves everything beyond it along its axis without turning: Jv_i = z(i-1), Jw_i = 0.

Step 5: sanity checks you can do in your head. Jv_i is perpendicular to z(i-1) (a cross product always is). A joint whose axis passes through the gripper has Jv_i = 0. At home our arm points along x; the base axis z0 is vertical; so turning the base moves the wrist along +y at the arm's full reach.

**Worked example**

The 3-DOF arm at home: frames 0, 1, 2 have their origins at the base, at the shoulder (0, 0, 0.3) and at the elbow (0.4, 0, 0.3); the wrist is at (0.7, 0, 0.3). z0 points up, z1 and z2 along -y (row 1's 90° twist tipped them):

```python
def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

p_e = [0.7, 0.0, 0.3]
axes = [[0, 0, 1], [0, -1, 0], [0, -1, 0]]
origins = [[0, 0, 0], [0, 0, 0.3], [0.4, 0, 0.3]]
for z, o in zip(axes, origins):
    r = [e - p for e, p in zip(p_e, o)]
    print([round(x, 2) + 0 for x in cross(z, r)], z)
# Output:
# [0.0, 0.7, 0.0] [0, 0, 1]
# [0.0, 0.0, 0.7] [0, -1, 0]
# [0.0, 0.0, 0.3] [0, -1, 0]
```

The base swings the wrist sideways at 0.7 m/s; the shoulder lifts it at 0.7 m/s (radius 0.7), the elbow at 0.3 m/s (radius 0.3).

**Watch out**

The off-by-one is THE classic bug here: joint i turns about z(i-1), not z(i). For our arm it only shows on joint 1, because z1, z2 and z3 are all parallel: using "the next frame's" axis is right by coincidence for joints 2 and 3, and spectacularly wrong for the base. Also: the geometric Jacobian's angular rows are in the BASE frame, and its Jv is the velocity of the gripper POINT. Ticket 5 meets Jacobians that mean something slightly different.

**AI check**

AI-written Jacobian code often mixes conventions: z(i) for modified (Craig) DH, z(i-1) for standard DH. Ask which DH convention the frames follow, then check one column by finite differences at a pose where every joint is non-zero.
