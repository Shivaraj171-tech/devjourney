There are two separate bugs. Run the tests and read which ones fail: one group is about the lift (a prismatic joint), the other about counting degrees of freedom. In the 3D view, watch the lift's frame: does it rise, or turn?
---
A prismatic joint is a pure move: rotation = identity, translation = q times the UNIT axis. `trans(x, y, z)` and `unit(axis)` are already imported. For the count, Grübler's formula is m (N - 1 - J) + sum(f): which link never moves, and so has no freedoms to lose?
---
In `joint_transform`, split Byte's combined `if` into two branches: keep `turn(rodrigues(axis, q))` for "revolute", and for "prismatic" return `trans(...)` of `unit(axis)` scaled by q. In `mobility`, subtract one more link inside the brackets: the ground.
