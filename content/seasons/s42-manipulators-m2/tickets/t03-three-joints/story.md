**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-203: The arm that only works at home

Out of the plane. `kin/rrr.py` is a real 3-DOF arm in the "RRR" layout most industrial robots use: a base that **yaws** about the vertical, then a **shoulder** and an **elbow** that pitch the arm up and down. The shoulder axis is horizontal, so the first transform tips the next joint's z axis over with a 90° twist about x.
Byte wrote `rrr_fk` and sent a screenshot. At home (all joints 0) the wrist is exactly where it should be, 0.70 m out and 0.30 m up. Every other pose is wrong, sometimes by most of a metre.
The 3D view draws the base, shoulder and elbow from the links, and the wrist from your `rrr_fk`. When the order is right, the arm is one piece.
