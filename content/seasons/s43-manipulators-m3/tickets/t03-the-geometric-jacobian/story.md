**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-303: No more calculus 📐

Differentiating by hand was fine for two links. For six it's a page of trigonometry and a typo on every line. There is a better way: the frames from Module 2 already contain everything. Each revolute joint turns about a known axis through a known point, and a point swung around an axis moves at "axis cross radius". One cross product per joint, and you have the Jacobian of ANY arm: `vel/geometric.py`.
Byte wrote it for our 3-DOF arm. Joints 2 and 3 check out against finite differences; joint 1, the base, is completely wrong: the wrist seems to fly upwards when the base turns.
In the 3D view the short arrows are the joint axes z0, z1, z2, and the long arrows at the wrist are YOUR columns. A column must always be perpendicular to its own joint's axis.
