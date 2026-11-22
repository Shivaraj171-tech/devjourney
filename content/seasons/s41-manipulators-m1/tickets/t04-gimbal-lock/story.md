**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-104: The dashboard says one thing, the wrist does another

Our operators don't think in matrices. The dashboard shows each box's orientation as three angles, **yaw, pitch, roll** (Euler angles, ZYX order), and they type angles back to correct a pose. `rigid/euler.py` converts both ways.
Two complaints from the floor. Any box tipped forward shows up on the dashboard tipped *backward*. And when a box stands straight up on its end (pitch 90°), the angles come out as nonsense: type them back in and Grabby spins the box to a different pose. 🌀
That second one isn't only a bug, it's famous: **gimbal lock**. The lesson explains it, and the 3D view shows it: at pitch 90°, turning the yaw knob and turning the roll knob make the very same motion.
