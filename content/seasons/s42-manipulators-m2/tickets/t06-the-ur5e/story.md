**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-206: A real robot, a mirrored home

The vendor's demo unit is here: a **Universal Robots UR5e**, six revolute joints. Its maker publishes the arm's nominal DH table, and that's all `kin/ur5e.py` needs. `ur5e_frames(q)` gives the base and all six joint frames, and `ur5e_fk(q)` the tool flange.
Byte typed the table in "from a blog post". The 3D view looks like a robot, which is the dangerous part. In the published table the home pose (every joint at 0) has the flange at (-0.817, -0.233, 0.063) m. Ours is mirrored. Three random poses are also checked against the laptop lab's independent numpy implementation.
This is the module's first full 6-DOF arm. In the 3D view each of the six DH frames has its own triad. Watch them as the arm moves.
