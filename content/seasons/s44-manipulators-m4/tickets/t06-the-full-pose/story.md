**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-406: The UR5e needs the whole pose

Ticket 5 only cared where the wrist ended up. Grabby-6, our UR5e, has to arrive with the gripper turned the right way too: position AND orientation, six numbers to match with six joints. The error between "where the flange is" and "where it should be" is now a pose, and Newton needs a vector. Module 3 has the answer: a body twist, and the body Jacobian that maps joint steps onto it.
`ik/pose_newton.py` computes the twist error with a matrix logarithm, log_SE3. Byte's version converges every time, and the IK team was ready to ship it. My round-trip test (exp a known twist, take the log, compare) disagrees in the translation part. Converging and correct are different things.
The 3D view replays YOUR solver frame by frame until the flange's frame sits exactly on the dashed target frame. The chart shows both halves of the error.
