Read the names. `T_base_gripper` turns GRIPPER coordinates into BASE coordinates (p_base = T_base_gripper p_gripper). The box arrives in base coordinates, and you want gripper coordinates. Which way does Byte's line convert?
---
You need the transform that goes the other way, from base to gripper: T_gripper_base. Swapping the two names of a transform means inverting it: T_gripper_base = T_inv(T_base_gripper). `T_inv` is already imported.
---
`box_in_gripper` should apply `T_inv(T_base_gripper)` to `p_box_base`. Check it with the names: T_gripper_base p_base: the inner "base" names touch and cancel, leaving a point in the gripper frame.
