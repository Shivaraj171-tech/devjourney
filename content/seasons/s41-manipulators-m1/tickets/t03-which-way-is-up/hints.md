Look at the middle triad in the 3D view (`rot_y`). Use the right-hand rule: thumb along +y, your fingers curl from z towards x. Does its z axis swing towards +x? Then look at the mirror: its axes are unit length and at right angles, so what is different about it?
---
Two bugs. `rot_y` has its two sines swapped: z must go to x, so column 2 (where z goes) must have +sin in row 0. And `is_rotation` only checks that R^T R = I, which a mirror passes too. A proper rotation also has det(R) = +1; a mirror has -1. `det3` is already written.
---
For `rot_y`, write it from where the axes go: x goes to (cos θ, 0, -sin θ), y stays (0, 1, 0), z goes to (sin θ, 0, cos θ). Those are the COLUMNS. For `is_rotation`, keep the orthonormal test and also require `det3(R)` to be within `tol` of +1 (not of -1, and not "of 1 in size").
