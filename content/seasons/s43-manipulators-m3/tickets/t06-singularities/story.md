**From:** Maya (Tech Lead)
**Ticket:** MAN-306: A map of the danger zones 🗺️

Rosa wants the motion planner to know where the UR5e gets stuck: the poses where its Jacobian loses rank and some gripper motion becomes impossible. Two tools: `vel/linalg.py` (a determinant and a rank by Gaussian elimination, plus a solver we'll need later; still no numpy in the browser) and `vel/singular.py`, which names the kind of singularity from the closed-form determinant in the laptop lab.
Byte wrote both. The determinant agrees with the closed form at two of three random poses and has the opposite sign at the third. And the planner says the wrist flip, the singularity everyone on the floor knows about, never happens.
The 3D view shows the two classic singularities on the real arm: the elbow stretching out, and the wrist flip, with the axes of joints 4 and 6 drawn as arrows. Watch them line up. The chart is det J along both motions, from YOUR `det`.
