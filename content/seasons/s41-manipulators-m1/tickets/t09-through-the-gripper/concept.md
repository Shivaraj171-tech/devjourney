**Frames of reference and transform chains**

**Intuition**

"Where is the box?" has no single answer. To the base, it's 50 cm to the left. To the gripper, it's 30 cm straight ahead. Same box, different **frames of reference**. A robot is a chain of frames (base, shoulder, elbow, wrist, gripper, camera, box), and most robotics bugs are a transform used in the wrong direction.

The cure is a naming habit that makes direction impossible to miss, and makes the algebra check itself.

**The maths**

Step 1, the name. Write T_a_b for the pose of frame b expressed in frame a. It converts b-coordinates into a-coordinates:

```text
p_a = T_a_b p_b
```

Read it right to left: a point in b goes in, a point in a comes out. The inner names (b next to p_b) **touch**.

Step 2, chaining. If you know where the shoulder is in the base (T_base_shoulder) and where the gripper is in the shoulder (T_shoulder_gripper), substitute one into the other:

```text
p_base = T_base_shoulder p_shoulder = T_base_shoulder (T_shoulder_gripper p_gripper)
T_base_gripper = T_base_shoulder T_shoulder_gripper
```

The inner names cancel like fractions: base_(shoulder) (shoulder)_gripper → base_gripper. A chain a → b → c → d is T_a_b T_b_c T_c_d, multiplied left to right, from the root outwards.

Notice this is "post-multiplication": each new transform goes on the **right**. Ticket 2 put the new turn on the left. Both are right: there, every turn was about the fixed **world** axes; here, each transform is expressed in the **previous, moving** frame. Fixed frame: pre-multiply. Moving frame: post-multiply.

Step 3, the other direction. Swapping the names inverts the transform (ticket 8):

```text
T_b_a = (T_a_b)⁻¹          p_gripper = T_gripper_base p_base = (T_base_gripper)⁻¹ p_base
```

Step 4, a sanity rule. In any product, adjacent names must match. T_base_gripper p_base has "gripper" touching "base": the expression is nonsense even though Python happily multiplies it. That is exactly the bug in this ticket.

**Worked example**

The gripper is 0.5 m in front of the base, turned 90° about z (its x axis points along base y). The box is at base (0.5, 0.3, 0). Where is it for the gripper?

```python
R = [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
t = [0.5, 0.0, 0.0]
box = [0.5, 0.3, 0.0]
Rt = [[R[j][i] for j in range(3)] for i in range(3)]
d = [box[i] - t[i] for i in range(3)]
in_gripper = [round(sum(Rt[i][k] * d[k] for k in range(3)), 3) + 0 for i in range(3)]
print(in_gripper)
# Output:
# [0.3, 0.0, 0.0]
```

0.3 m straight along the gripper's own x: right in front of the fingers.

**Watch out**

The two directions look alike in code: `T_apply(T, p)` versus `T_apply(T_inv(T), p)`. Only the names tell you which is right, so name every transform variable T_from_to and every point p_frame. Many libraries (ROS tf, for one) also use "the transform from A to B" to mean opposite things in different places: always check which way the points go.

**AI check**

Read an AI's frame code by the names alone: in every product, do the touching names match? Then test one case you can picture, like a box straight ahead of the gripper, which must come out as (d, 0, 0).
