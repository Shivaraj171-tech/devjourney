**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-310: Module 3 concept check

Grabby-6 turned 400 boxes this afternoon without a freeze, and the planner now steers around the wrist flip by itself. You built its velocity kinematics from a finite difference up: the Jacobian by hand and from frames, the UR5e's 6x6 checked by a checker you checked, twists in two frames, singularities, the ellipsoid that goes flat, forces back through Jᵀ, and the monitor that watches κ.
Module 4 is inverse kinematics, where this Jacobian does the heavy lifting. Nothing is broken this time. Open the Quiz tab, with `vel/` beside it if that helps. Practice puzzles follow the questions.
Three sentences answer most of it: "column i is what joint i alone does to the gripper", "speeds go out through J, forces come back through Jᵀ", and "the radii are the singular values". Try each one before you reach for a formula.
