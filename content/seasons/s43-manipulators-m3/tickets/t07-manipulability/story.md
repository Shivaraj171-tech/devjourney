**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-307: How close is too close? 🥚

det J says yes or no: singular or not. The planner needs a number that says HOW close a pose is to trouble, and a picture of which directions are getting hard. That's the velocity ellipsoid: every gripper velocity that joint speeds of size 1 can produce. Round means the arm moves easily every way; flat means one direction is nearly gone. Its volume is Yoshikawa's manipulability.
`vel/ellipsoid.py` has the eigen-solver already (Jacobi rotations, tested). Byte wrote the two functions on top of it, and the ellipsoid in the 3D view looks oddly small, and the manipulability chart sits near zero even with a nicely bent elbow.
Watch the 3D view: the 3-DOF arm straightens its elbow and the ellipsoid at the wrist (drawn at 0.4 x its size) collapses into a flat disc. The text under the view gives the radii and the condition number frame by frame.
