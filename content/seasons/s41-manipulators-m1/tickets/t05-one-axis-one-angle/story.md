**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-105: The vision system speaks axis-angle

The new shelf camera doesn't report three angles. It reports things like "box turned 120° about the axis (1, 1, 1)": **one axis, one angle**. Any orientation can be described that way (it's a theorem). `rigid/axis_angle.py` turns that into a matrix with Rodrigues' formula, and back again, so we can log how far each box is off.
Two problems. The camera doesn't scale its axis to length 1, so our matrices come out stretched, and the safety check from ticket 3 rejects them. And when a box has been flipped right over (180°), `to_axis_angle` returns the axis (0, 0, 0), which isn't an axis.
The 3D view shows the box turning about the camera's tilted axis (dashed). A third of a turn about (1, 1, 1) does something neat to the axes. Watch where x, y and z end up.
