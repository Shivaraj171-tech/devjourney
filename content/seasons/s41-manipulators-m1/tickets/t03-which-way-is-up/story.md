**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-103: The box tipped backwards, and the safety check waved it through

Grabby tips boxes forward onto the shelf with a turn about the y axis. This morning it tipped one *backwards*, off the conveyor. 📦💥 `rigid/rotations.py` has a turn for each axis; Byte typed all three in one go.
Worse: we have a safety check, `is_rotation(R)`, that every pose goes through before the motors move. Last week a calibration file with one axis flipped (a mirror image) sailed straight through it. A mirror is not a pose any real box can be in.
Fix both. The 3D view shows `rot_x`, `rot_y` and `rot_z` turning side by side, each with its axis dashed, and the mirror frame next to a real one: compare their z axes.
