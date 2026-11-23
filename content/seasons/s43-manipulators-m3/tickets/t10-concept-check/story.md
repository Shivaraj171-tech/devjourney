**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-310: Module 3 concept check ✅

Grabby-6 turned 400 boxes this afternoon without a single freeze, and the motion planner now steers around the wrist flip on its own. You built its velocity kinematics from a finite difference up: the Jacobian by hand and from frames, the UR5e's 6x6 checked by a checker you checked, twists in two frames, singularities, the ellipsoid that goes flat, the forces that come back through Jᵀ, and the monitor that watches κ.
Before Module 4 (inverse kinematics, where this Jacobian does the heavy lifting), let's make sure the ideas stuck. No new bug: read through `vel/` if you like, then answer the questions in the Quiz tab. There are a few practice puzzles too.
Three sentences answer almost everything: "column i is what joint i alone does to the gripper", "speeds go out through J, forces come back through Jᵀ", and "the radii are the singular values". Try each before reaching for a formula.
