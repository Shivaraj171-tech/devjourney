**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-303: No more calculus

By hand was fine for two links. For six it's a page of trigonometry with a typo on every line. The frames from Module 2 already hold everything we need. Each revolute joint turns about a known axis through a known point, and a point swung around an axis moves at "axis cross radius". One cross product per joint gives the Jacobian of ANY arm: `vel/geometric.py`.
Byte wrote it for our 3-DOF arm. Joints 2 and 3 check out against finite differences. Joint 1, the base, is completely wrong: the wrist seems to fly upwards when the base turns.
In the 3D view the short arrows are the joint axes z0, z1, z2, and the long arrows at the wrist are YOUR columns. A column must always be perpendicular to its own joint's axis.
