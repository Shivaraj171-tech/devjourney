**The UR5e's 6x6 Jacobian, checked by finite differences**

**Six columns, six rows**

Six joints, six columns; six numbers of gripper motion (three of speed, three of spin), six rows. The UR5e's geometric Jacobian is the 3-DOF recipe applied to the six DH frames of Module 2. But a Jacobian is only trustworthy once something independent agrees with it, and the most independent thing there is: wiggle each joint a tiny bit and watch the flange. The linear part is easy (a position moves). The angular part is subtler: you can't subtract two orientations. You have to ask how the rotation MATRIX changes, and turn that change into a spin vector.

**Columns from frames, checked by differences**

Step 1: the Jacobian. frames = ur5e_frames(q) gives [T_0_0, ..., T_0_6]; column i = [z(i-1) × (p6 - p(i-1)); z(i-1)]. A 6 × 6 matrix, in base-frame axes.

Step 2: how a rotation matrix moves. If the flange spins with angular velocity w (base frame), every column r of R moves like a point on a spinning body: dr/dt = w × r = [w] r. All three columns at once:

```text
dR/dt = [w] R        so        [w] = (dR/dt) Rᵀ        (Rᵀ R = I)
```

[w] is the skew matrix of w; "vee" reads w back out of it: w = (W[2][1], W[0][2], W[1][0]).

Step 3: the order matters. (dR/dt) Rᵀ gives w in the BASE frame. The other product, Rᵀ (dR/dt), is also skew-symmetric, and gives the same spin written in the FLANGE's own axes (w_b = Rᵀ w). Both are "an angular velocity"; only one matches the geometric Jacobian's rows.

Step 4: the finite-difference column. Nudge joint i by ±h:

```text
v_i = (p(q + h e_i) - p(q - h e_i)) / 2h
Ṙ_i = (R(q + h e_i) - R(q - h e_i)) / 2h,     w_i = vee(Ṙ_i Rᵀ)
```

Step 5: compare entry by entry, at several random poses, with a tolerance (1e-6 is generous for h = 1e-6).

**A tipped flange spinning about z**

A single joint spinning a tipped flange about the base's z axis: whatever way the flange is tipped, its base-frame spin is (0, 0, 1). The two products tell different stories:

```python
import math

def Rz(a):
    return [[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]]

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]

tip = [[1, 0, 0], [0, 0, -1], [0, 1, 0]]  # the flange tipped 90° about its x
R = lambda a: mul(Rz(a), tip)
h, a = 1e-6, 0.4
Rd = [[(p - m) / (2 * h) for p, m in zip(rp, rm)] for rp, rm in zip(R(a + h), R(a - h))]
Rt = [list(r) for r in zip(*R(a))]
vee = lambda W: [round(W[2][1], 3) + 0, round(W[0][2], 3) + 0, round(W[1][0], 3) + 0]
print(vee(mul(Rd, Rt)), vee(mul(Rt, Rd)))
# Output:
# [0.0, 0.0, 1.0] [0.0, 1.0, 0.0]
```

Base frame: a spin about z, as expected. Flange frame: the same spin, but the flange's own y axis is what points up.

**Check the checker**

When two pieces of code disagree, the newer, smaller one is not automatically right, and neither is the older. Test the checker itself on a case you can solve in your head. And a skew-symmetric result is not a correctness check: both Ṙ Rᵀ and Rᵀ Ṙ are skew-symmetric. Finally, compare the whole matrix: a check that only looks at the linear rows would have passed a Jacobian whose angular rows were garbage.

**Angular velocity in which frame?**

Ask an AI to "compute angular velocity from rotation matrices" and it may give either product without saying which frame the answer is in. Always ask: in which frame is this w expressed, and does that match the frame of what I compare it with?
