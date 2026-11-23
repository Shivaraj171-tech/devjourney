**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-304: The UR5e's Jacobian fails its check 🧪

Good news first: with ticket 3's `geometric_jacobian`, the UR5e's full 6x6 Jacobian is one line, `geometric_jacobian(ur5e_frames(q))`. Bad news: Byte also wrote an independent finite-difference checker in `vel/ur5ej.py`, and it says our Jacobian is wrong in the bottom three rows, the angular velocity, at every pose.
Two pieces of code disagree, so at least one of them is wrong. The linear rows match to 10 digits. Before anyone "fixes" a Jacobian that the whole module now relies on, find out which one is lying. The test suite has a tiny robot whose answer you know without any code.
The 3D view runs the UR5e for one second at constant joint speeds, with the flange's velocity v and angular velocity w (x 0.2) as arrows.
