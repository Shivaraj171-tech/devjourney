**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-209: Prove they agree

We have two forward kinematics for the UR5e now: the DH table (ticket 6) and the product of exponentials (ticket 8). If they ever disagree, one is wrong, and the robot won't tell you which. Before Grabby-6 arrives I want a **proof by test**. Build the UR5e's PoE description (the home pose M and six screw axes) straight from its DH frames, then show both give the same 4x4 at many random poses.
`kin/ur5e_poe.py`: `screws_from_dh(table)` reads M and the screws off the DH frames at home, and `ur5e_poe(q)` runs PoE. Byte wrote a first version. The home pose agrees. It would, whatever the screws are. Nothing else does.
In the 3D view the arm is drawn from DH, and your PoE answer is the dashed target triad. If they agree, the flange sits exactly on it.
