**Decoupling: the wrist centre splits a 6-DOF IK in two**

**Intuition**

Hold a cup and keep your wrist still in space: your hand can still tilt and turn the cup in every direction. A spherical wrist is that, engineered: its three axes meet in one point, so turning joints 4, 5 and 6 spins the gripper about the wrist centre without ever moving it. Turn that around for IK: wherever the target flange is, the wrist centre must sit a fixed distance behind it, along the gripper's approach direction. Find that point, and the big arm (joints 1-3) has a position problem you already solved; what's left for the wrist is a pure orientation problem.

**The maths**

Step 1: the wrist centre from the target. The flange is D6 beyond the wrist centre along the flange's own approach axis z6, the third COLUMN of the target's rotation R. Back off:

```text
p_w = p - D6 · z6          z6 = (R[0][2], R[1][2], R[2][2])
```

Step 2: position IK for joints 1-3. Exactly ticket 3: q1 = atan2(y_w, x_w), then a planar two-link arm from the shoulder, with links A2 and D4 (the forearm runs along z3, which is why its length sits in the d column of the DH table, and why that row has a 90° offset).

Step 3: orientation IK for joints 4-6. Joints 1-3 fix frame 3's orientation R_0_3. The wrist must supply the rest:

```text
R_3_6 = R_0_3ᵀ R
```

For this wrist R_3_6 has the structure of ZYZ Euler angles, so q4, q5, q6 come out by atan2 (q5 ≥ 0 here; -q5 with q4 + π and q6 + π is the other wrist solution).

Step 4: the count. Two shoulder choices × two elbows from step 2, × two wrists from step 3: up to 8 solutions for one pose, like the UR5e. (The UR5e's wrist is NOT spherical: its axes are offset by d4, d5, d6. Its closed form exists but is messier; ticket 6 solves it numerically instead.)

**Worked example**

A target flange tilted 90° (z6 pointing along +x), 0.1 m beyond the wrist (D6 = 0.1): where is the wrist centre?

```python
D6 = 0.1
T = [[0.0, 0.0, 1.0, 0.7],
     [0.0, 1.0, 0.0, 0.2],
     [-1.0, 0.0, 0.0, 0.4],
     [0.0, 0.0, 0.0, 1.0]]
z6 = [T[i][2] for i in range(3)]
p = [T[i][3] for i in range(3)]
p_w = [round(p[i] - D6 * z6[i], 3) for i in range(3)]
print(z6, p_w, [p[0], p[1], round(p[2] + D6, 3)])
# Output:
# [1.0, 0.0, 0.0] [0.6, 0.2, 0.4] [0.7, 0.2, 0.5]
```

The gripper points along x, so the wrist centre is 10 cm behind it along x. "10 cm above it" (the last list) would only be right for a gripper pointing straight down.

**Watch out**

Assumptions from the usual case: most picks come from above, gripper pointing down, and then "the wrist is D6 above the flange" happens to be true. Tests that only use pick-from-above poses pass it. Always include a tilted target. Also: the approach axis is the third COLUMN of R (Module 2's bug was reading it from a row).

**AI check**

When an AI writes decoupled IK, check the wrist-centre line first: does it use the target's own z axis? Then test a pose made by forward kinematics with every wrist joint non-zero: solving it must give back the same pose.
