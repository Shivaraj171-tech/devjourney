**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-306: A map of the danger zones

I want the motion planner to know where the UR5e gets stuck: the poses where its Jacobian loses rank and some gripper motion becomes impossible.
Two tools. `vel/linalg.py`: a determinant and a rank by Gaussian elimination, plus a solver for later (still no numpy in the browser). `vel/singular.py`: names the kind of singularity from the closed-form determinant in the laptop lab.
Byte wrote both. The determinant matches the closed form at two of three random poses and has the opposite sign at the third. And the planner says the wrist flip never happens. Everyone on the floor has seen the wrist flip.
The 3D view shows the two classic singularities on the real arm: the elbow stretching out, and the wrist flip, with the axes of joints 4 and 6 as arrows. Watch them line up. The chart is det J along both motions, from YOUR `det`.
