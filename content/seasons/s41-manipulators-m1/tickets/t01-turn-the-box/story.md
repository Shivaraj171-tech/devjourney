**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-101: Every box comes out turned the wrong way

Grabby moves from the flat packing table to the new 3D shelves this week. Boxes now have to arrive the right *way round*, labels facing out, as well as in the right *place*. That's orientation. This whole module is about describing it properly.
We start flat. Seen from above, Grabby turns each box on the table before it slides it into a slot. Byte wrote `rot2()` in `rigid/rot2.py` last night. Every box comes out turned the wrong way: ask for 90° anticlockwise and the label ends up facing the wall.
Read the lesson first (the Learn tab). It shows *why* the matrix looks the way it does, so you can fix it without guessing. The Lab viewer now has a 3D view. Drag it (or use the arrow keys) to look around. The dashed triad is where the box should end up.
