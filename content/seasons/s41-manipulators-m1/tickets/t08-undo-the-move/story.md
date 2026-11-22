**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-108: The inverse that isn't

So far we only turned boxes. On the shelves a box also sits somewhere: a pose is a rotation AND a position. Robots keep both in one **4x4 homogeneous transform**, so a whole move is a single matrix product. `rigid/transform.py` builds them, applies them to points, and inverts them.
The inverse is the one that matters most: "where is this world point, as seen from the box?" Byte wrote it in one line: "rotations are orthonormal, so the inverse is the transpose". For a pure turn that's true. For a box that is also *somewhere*, it puts the box's position in the bottom row, where only [0, 0, 0, 1] belongs.
The 3D view slides a frame from the box to T · T_inv(T). If the inverse is right, it lands exactly on the world frame. Byte's lands... somewhere else, and the viewer will warn you about that bottom row.
