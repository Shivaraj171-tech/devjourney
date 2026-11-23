**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-405: IK without a formula 🧮

Closed-form IK needs a clever decomposition for every arm, and many arms (the UR5's offset wrist, anything with seven joints) don't have a neat one. The general tool is numerical: guess, measure the error with forward kinematics, use the Jacobian from Module 3 to work out the joint step that would fix it, repeat. That's Newton-Raphson, and near a solution it converges astonishingly fast.
`ik/newton.py` runs it on our 3-DOF arm, starting from wherever the arm is. Byte's version wanders around the table and never arrives: the error grows on the very first step.
The 3D view replays YOUR solver one iterate at a time, with the error vector drawn from the wrist to the box, and the chart shows the error per iteration on a log scale. A working Newton is a staircase falling off a cliff.
