**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-206: A real robot, a mirrored home 🤖

The vendor's demo unit arrived: a **Universal Robots UR5e**, six revolute joints, one of the most common collaborative arms in the world. Its maker publishes the arm's nominal DH table, and that's all `kin/ur5e.py` needs: `ur5e_frames(q)` gives the base and all six joint frames, and `ur5e_fk(q)` the tool flange.
Byte typed the table in "from a blog post" and the 3D view looks like a robot, which is exactly the danger. The table's home pose (every joint at 0) has the flange at (-0.817, -0.233, 0.063) m. Ours is mirrored. Three random poses are also checked against our laptop lab's independent numpy implementation.
This is the first full 6-DOF arm of the module: in the 3D view, every one of the six DH frames has its own triad. Watch them as the arm moves.
