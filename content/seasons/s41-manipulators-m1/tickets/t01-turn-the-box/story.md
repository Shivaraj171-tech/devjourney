**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-101: Every box comes out turned the wrong way

Big week: Grabby is moving from the flat packing table to the new 3D shelves. 🦾 From now on, boxes don't just go to the right *place*, they have to arrive the right *way round*, labels facing out. That's orientation, and the whole module is about describing it properly.
We start flat. Seen from above, Grabby turns each box on the table before it slides it into a slot. Byte wrote `rot2()` in `rigid/rot2.py` last night, and every box comes out turned the wrong way: ask for 90° anticlockwise and the label ends up facing the wall.
Read the lesson first (📘 Learn): it shows *why* the matrix looks the way it does, so you can fix it without guessing. The 🔭 Lab viewer now has a 3D view: drag it (or use the arrow keys) to look around. The dashed triad is where the box should end up.
