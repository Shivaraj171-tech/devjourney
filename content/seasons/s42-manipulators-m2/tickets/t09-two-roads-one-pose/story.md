**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-209: Prove they agree

We now have two forward kinematics for the UR5: the DH table (ticket 6) and the product of exponentials (ticket 8). If they ever disagree, one of them is wrong, and a robot doesn't tell you which. So before Grabby-6 arrives, I want a **proof by test**: build the UR5's PoE description (the home pose M and six screw axes) straight from its DH frames, then show both roads give the same 4x4 at many random poses.
`kin/ur5_poe.py`: `screws_from_dh(table)` reads M and the screws off the DH frames at home, and `ur5_poe(q)` runs PoE. Byte wrote the loop that picks each joint's axis. The home pose agrees (it would, whatever the screws are). Nothing else does.
In the 3D view the arm is drawn from DH; your PoE answer is the dashed target triad. Agreement means the flange sits exactly on it.
