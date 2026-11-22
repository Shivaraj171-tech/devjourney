Two bugs. Look at the first check: `from_axis_angle([0, 0, 1], 90°)` should be (cos 45°, 0, 0, sin 45°). What does the code put into cos and sin? Then watch the 3D view: the triad grows as `spin()` runs. Print `norm(q)` after a few hundred steps.
---
Quaternions use HALF the angle: q = (cos(θ/2), sin(θ/2) u), because rotating means q v q* and q appears twice. And each step of `spin` adds a little vector to q that is (almost) perpendicular to it, so |q| grows a tiny bit every step: by 1000 steps it's 5% too long, and `rotate` scales vectors by |q|².
---
In `from_axis_angle`, set `h = angle / 2`. In `spin`, after the line that adds `0.5 * dq * dt`, put q back on the unit sphere with the `normalize()` helper that's already in the file, every step.
