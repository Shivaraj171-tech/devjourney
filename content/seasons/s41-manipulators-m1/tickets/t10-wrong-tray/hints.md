Read the self-test lines in the logs: with yaw 90° the gripper is exactly where it is with yaw 0°. The turntable's turn has no effect on the position at all. In which order does `gripper_pose` chain the three transforms, and what does the naming rule from ticket 9 say it should be?
---
There are two bugs. (1) The chain must go from the root outwards: T_base_turntable, then T_turntable_wrist, then T_wrist_gripper. (2) Inside `T_turntable_wrist`, the order of "walk along the arm" and "tilt" matters: the shoulder tilts the WHOLE arm, so the tilt must act on the walk. Right now the arm walks out flat and only tilts at its far end.
---
In `gripper_pose`, put the transforms in base → turntable → wrist → gripper order. In `T_turntable_wrist`, swap the two factors so it is `T_mul(turn(rot_y(pitch)), trans(UPPER_ARM, 0.0, 0.0))`: tilt first (on the left), then walk along the tilted x axis. Compare with `T_wrist_gripper`, where the walk comes first and the roll happens at the fingertips.
