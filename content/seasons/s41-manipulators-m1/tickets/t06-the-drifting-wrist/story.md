**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-106: The wrist thinks the box is getting bigger

Grabby's wrist has an IMU (a gyro): 100 times a second it reports how fast the wrist is spinning, and `spin()` in `rigid/quat.py` adds that up into an orientation. Like every IMU and game engine, we store orientations as **unit quaternions**: four numbers, no gimbal lock, cheap to combine.
After ten seconds of spinning, the "box corner" the wrist computes is 10% further from the centre than it really is. Boxes don't grow. Separately, the very first quaternion is already wrong: ask for a 90° turn and you get 180°.
The 3D view replays ten seconds of the wrist spinning at 2 rad/s. Watch the size of the triad: a rotation never changes it.
