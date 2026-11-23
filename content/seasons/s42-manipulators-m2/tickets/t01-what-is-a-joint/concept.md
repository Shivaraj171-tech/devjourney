**Joints, links and degrees of freedom**

**Intuition**

A robot arm is a chain of rigid **links** joined by **joints**. Each joint lets the link after it move in exactly one way relative to the link before it:

- a **revolute** joint (R) turns about an axis, like a door hinge or your elbow. Its joint variable q is an angle;
- a **prismatic** joint (P) slides along an axis, like a drawer or a lift. Its q is a distance.

Everything else about the joint is fixed geometry: where the axis is and which way it points. So a joint is a 4x4 transform that depends on one number: a turn by q about the axis (rotation, no translation), or a slide by q along it (translation, no rotation). Nothing in between: a revolute joint never translates its own frame, and a prismatic joint never turns it.

The number of independent ways a mechanism can move is its **degrees of freedom** (DOF). A free rigid body in space has 6: three to say where it is, three to say which way it faces (Module 1). A serial arm gets one DOF per one-freedom joint.

**The maths**

Step 1: what a joint does, as a transform. For a unit axis u:

```text
revolute:   T(q) = [ R(u, q)  0 ]      (Rodrigues, Module 1 ticket 5)
                   [   0      1 ]
prismatic:  T(q) = [ I    q u ]
                   [ 0     1  ]
```

Step 2: counting freedoms (Grübler's formula). Start with N links, including the **ground** (the fixed base), and J joints, joint i allowing f_i freedoms. Each moving link alone would have m freedoms (m = 6 in space, 3 in the plane), so N - 1 moving links have m (N - 1). Each joint takes away all the relative freedom between its two links except its own f_i, so it removes m - f_i:

```text
dof = m (N - 1) - sum(m - f_i) = m (N - 1 - J) + sum(f_i)
```

Step 3: an open chain. A serial arm has one joint per moving link, so J = N - 1 and the first term vanishes: dof = sum(f_i). Six revolute joints: 6 DOF.

Step 4: why six. A pose is six numbers (position x, y, z and orientation), so to reach an arbitrary pose in its workspace an arm needs at least six joints. Five can't: some orientations are always missing. Seven is **redundant**: infinitely many joint settings give the same pose, which lets an arm (or your own arm, with its 7) dodge obstacles while holding the gripper still.

Step 5: closed loops cost freedoms. A planar four-bar linkage (ground plus 3 moving links, 4 hinges, a loop) has 3 (4 - 1 - 4) + 4 = 1 DOF: one motor drives it all.

**Worked example**

The formula on four mechanisms, and what a prismatic joint does to a point:

```python
def mobility(links, freedoms, m=6):
    return m * (links - 1 - len(freedoms)) + sum(freedoms)

print(mobility(7, [1] * 6), mobility(8, [1] * 7), mobility(3, [1, 1], m=3), mobility(4, [1] * 4, m=3))
u, q = (0, 0, 1), 0.2
print([round(c * q, 2) for c in u])
# Output:
# 6 7 2 1
# [0.0, 0.0, 0.2]
```

A six-joint arm has 6, a seven-joint arm 7, a planar two-link arm 2, the four-bar 1. The lift moves its frame 0.2 m straight up, without turning it.

**Watch out**

Two classic slips. First, forgetting that the ground counts as a link: N - J instead of N - 1 - J gives a six-joint arm 12 DOF. Second, a prismatic axis must be a unit vector before you multiply by q, or "slide 0.2 m" slides further. And DOF counts freedoms of the *mechanism*: near special poses (singularities, Module 3) an arm can still lose the ability to move in some direction.

**AI check**

For any AI-written joint code, test the two pure cases: a revolute joint must leave its origin where it is, and a prismatic joint must leave every axis exactly as it was. For a DOF count, try the cases you know by heart: 6 for a six-joint arm, 1 for a four-bar.
