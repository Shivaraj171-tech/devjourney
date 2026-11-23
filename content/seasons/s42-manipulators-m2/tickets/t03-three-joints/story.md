**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-203: The arm that only works at home

Time to leave the plane. `kin/rrr.py` is a real 3-DOF arm, the classic "RRR" layout of almost every industrial robot: a base that **yaws** about the vertical, then a **shoulder** and an **elbow** that pitch the arm up and down. The shoulder axis is horizontal, so the first transform tips the next joint's z axis over with a 90° twist about x.
Byte wrote `rrr_fk` and proudly sent a screenshot: at home (all joints 0) the wrist is exactly where it should be, 0.70 m out and 0.30 m up. Every other pose is wrong, sometimes by most of a metre. Byte's comment says "the elbow turns the forearm first, so the last transform is applied first".
The 3D view draws the base, shoulder and elbow from the links, and the wrist from your `rrr_fk`. When the order is right, the arm is one piece.
