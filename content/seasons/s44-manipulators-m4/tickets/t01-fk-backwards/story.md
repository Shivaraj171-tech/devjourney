**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-401: How many ways to reach a box? 🔁

Three modules in, Grabby can say where its gripper is and how fast it moves. The packing line needs the opposite: "the box is HERE, which joint angles?". That's inverse kinematics, and before any formula we need to know what kind of answer to expect. Sometimes there's no answer, sometimes one, usually two, occasionally infinitely many.
For this module our two-link arm stands upright, so elbow up and elbow down mean what they say. `ik/reach.py` counts the solutions for a target, and the planner uses it to skip boxes that can't be reached. Byte's version says "2" for everything within arm's length, and the planner keeps sending the arm at boxes right next to its own shoulder.
The 3D view does inverse kinematics the dumbest possible way: try every pose on a grid and keep the ones that land on the box. Look at where their elbows are.
