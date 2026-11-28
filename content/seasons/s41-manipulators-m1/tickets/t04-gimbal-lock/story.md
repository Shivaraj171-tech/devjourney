**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-104: The dashboard says one thing, the wrist does another

The operators don't think in matrices. The dashboard shows each box's orientation as three angles, **yaw, pitch, roll** (Euler angles, ZYX order), and they type angles back to correct a pose. `rigid/euler.py` converts both ways.
Two complaints from the floor. Any box tipped forward shows on the dashboard as tipped *backward*. And when a box stands on its end (pitch 90°), the angles come out as nonsense: type them back in and Grabby spins the box to a different pose.
The second one has a name, **gimbal lock**, and the lesson explains it. The 3D view shows it: at pitch 90°, the yaw knob and the roll knob make the very same motion.
