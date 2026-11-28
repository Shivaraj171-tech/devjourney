**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-404: Six joints, two small problems

The new labelling station has a six-joint arm with a spherical wrist (Module 2, ticket 7: the last three axes meet at one point, the wrist centre). Six joints sound like six times the trouble. The wrist centre splits the IK in two: joints 1-3 put the wrist centre in place (ticket 3's method), joints 4-6 turn the gripper. `ik/wrist_ik.py` does both. The orientation half is written and tested.
Byte wrote the first step: find the wrist centre from the target flange pose. Every pick from above works. The first label that had to go on the SIDE of a box, with the gripper tilted, missed by 18 cm.
The 3D view solves a tilted pose. The arrow backs off from the target flange to YOUR wrist centre, then the arm moves onto the dashed target frame.
