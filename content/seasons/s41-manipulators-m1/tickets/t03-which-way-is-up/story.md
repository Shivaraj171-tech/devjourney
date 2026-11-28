**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-103: The box tipped backwards, and the safety check waved it through

Grabby tips boxes forward onto the shelf with a turn about the y axis. This morning it tipped box #58 *backwards*, off the conveyor. `rigid/rotations.py` has a turn for each axis. Byte typed all three in one go.
Second problem. Every pose goes through a safety check, `is_rotation(R)`, before the motors move. Last week a calibration file with one axis flipped (a mirror image) went straight through it. No real box can be in a mirror pose.
Fix both. The 3D view shows `rot_x`, `rot_y` and `rot_z` turning side by side, each with its axis dashed, and the mirror frame next to a real one. Compare their z axes.
