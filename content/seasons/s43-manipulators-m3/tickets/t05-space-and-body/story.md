**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-305: Twists for the IK team 🌀

Next month's inverse kinematics (Module 4) works with TWISTS: an angular velocity and a linear velocity packed into one 6-vector, written either in the base frame (the space Jacobian J_s) or in the gripper's own frame (the body Jacobian J_b). We have the screw axes from Module 2's product of exponentials, so `vel/screw_jac.py` builds both, and the one matrix that converts between frames, the adjoint.
Byte wrote it from memory, and every test fails, the 6x6 adjoint first. The test suite checks each Jacobian against finite differences of the flange pose, and checks that J_s gives back ticket 4's geometric Jacobian.
The 3D view shows why two "velocities" exist: the flange's own velocity, and v_s, the velocity of the point at the BASE ORIGIN, as if it were bolted to the gripper.
