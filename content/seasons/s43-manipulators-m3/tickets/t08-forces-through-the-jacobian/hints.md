Straight out and level, the shoulder must hold the box's weight times the arm's whole reach (13.7 N m), and Byte's code says 0. The power test says τ · q̇ and F · v disagree. Which of J's rows and columns belongs to joint 2?
---
Column i of J is joint i's lever (how the gripper moves when joint i turns), so τ_i = (column i) · F: that's Jᵀ F, the lesson's Step 2. Byte computes J F, which dots ROWS with F. For a square J it runs fine, which is why the bug hid.
---
Multiply by the transpose in `joint_torques` (`transpose` is already imported). Leave F as it is: the gripper pushes UP to hold the box.
