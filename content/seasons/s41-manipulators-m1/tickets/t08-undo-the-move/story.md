**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-108: The inverse that isn't

So far we only turned boxes. On the shelves a box also sits somewhere: a pose is a rotation AND a position. Robots keep both in one **4x4 homogeneous transform**, so a whole move is a single matrix product. `rigid/transform.py` builds them, applies them to points, and inverts them.
The inverse is the one that matters most: "where is this world point, as seen from the box?" Byte wrote it in one line. For a box that only turns, it works. For a box that is also *somewhere*, T · T_inv(T) should be the identity and isn't.
The 3D view slides a frame from the box to T · T_inv(T). If the inverse is right, it lands exactly on the world frame. Byte's lands... somewhere else, and the viewer will warn you about that bottom row.
