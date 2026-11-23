The very first step makes the error bigger (0.26 to 0.5), and the 3D view shows the arm moving AWAY from the box. Newton's step solves J dq = e. Which way does Byte's e point?
---
e must point from where the wrist is to where it should be: e = target - p(q) (the lesson's Step 1). Byte computes p(q) - target, so dq = J⁻¹ e is exactly the wrong way, every time.
---
Flip the error so it points from the wrist to the target. Then check the chart: the error should fall to about 1e-10 within six steps.
