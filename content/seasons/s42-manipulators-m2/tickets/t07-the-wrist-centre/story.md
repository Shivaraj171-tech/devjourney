**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-207: One point that never moves

The arm we're actually buying, Grabby-6, isn't a UR5e: it has a **spherical wrist**, the last three joint axes meeting in one point. That point, the **wrist centre**, is the most useful point on the whole robot: the wrist joints spin the gripper about it without ever moving it. In Module 4 we'll use it to solve inverse kinematics in two easy halves instead of one hard problem.
`kin/wrist.py` has a textbook arm with a spherical wrist (`SPHERICAL6_DH`) and `wrist_center(T_0_6, d6)`: start at the flange and back off d6 along the gripper's approach axis z6. Byte's version is off by a few centimetres at some poses and right at others, and in the 3D view "your wrist centre" wanders around while only the wrist joints move.
