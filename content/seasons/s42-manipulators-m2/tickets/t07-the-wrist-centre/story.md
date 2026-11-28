**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-207: One point that never moves

The arm we're buying, Grabby-6, isn't a UR5e. It has a **spherical wrist**: the last three joint axes meet in one point. That point, the **wrist centre**, is the most useful point on the robot. The wrist joints spin the gripper about it without moving it. In Module 4 it splits inverse kinematics into two easy halves.
`kin/wrist.py` has a textbook arm with a spherical wrist (`SPHERICAL6_DH`) and `wrist_center(T_0_6, d6)`: start at the flange and back off d6 along the gripper's approach axis z6. Byte's version is a few centimetres off at some poses and right at others. In the 3D view "your wrist centre" wanders around while only the wrist joints move.
