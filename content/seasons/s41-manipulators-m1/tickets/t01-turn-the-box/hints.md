Run the checks and drag the 3D view so you look down from above. The box's triad turns the opposite way to the dashed one. Now try it by hand: what should `rot2(90°)` do to the x axis (1, 0)? What does Byte's matrix do to it?
---
Byte's matrix treats each ROW as a turned axis. The lesson derives that the turned x axis (cos θ, sin θ) is the first COLUMN, and the turned y axis (-sin θ, cos θ) is the second column. Byte's matrix is the transpose: it turns by -θ.
---
Write the matrix so that reading DOWN the first column gives (cos θ, sin θ) and reading down the second column gives (-sin θ, cos θ). Which entry of row 0 should carry the minus sign?
