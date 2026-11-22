Two failing ideas. First: in the 3D view, are the box's axes still length 1 while it turns about (1, 1, 1)? Rodrigues' formula assumes a UNIT axis. Second: for the half turn, print `R - R^T` (the numbers `to_axis_angle` divides by 2 sin θ). What are they when θ = 180°?
---
`rodrigues` builds `skew(axis)` from the raw axis; there is already a `unit()` helper in the file. For the half turn, sin(180°) = 0 and R - R^T is all zeros, so 0 / 0 gives no axis. The lesson shows that at 180°, (R + R^T) / 2 = cos θ I + (1 - cos θ) u u^T, so the DIAGONAL holds u_i² and the off-diagonals hold u_i u_j.
---
Keep the normal formula when `math.pi - angle > 1e-3`. Otherwise: c = cos(angle); pick i, the row with the largest diagonal entry R[i][i]; u_i = sqrt((R[i][i] - c) / (1 - c)); every other u_j = (R[i][j] + R[j][i]) / (2 (1 - c) u_i). Return `unit(u)` and the angle.
