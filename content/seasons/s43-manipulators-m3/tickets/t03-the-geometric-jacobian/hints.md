Only column 1 is wrong. Look at the 3D view: the z0 arrow points up, but which axis does YOUR first column turn about? What do frames 1, 2 and 3 of this arm have in common that frame 0 doesn't?
---
In standard DH joint i turns about z(i-1), the axis of the frame BEFORE it (the lesson's Step 1). frames[0] is the base, so joint 1 uses frames[0]'s z. Byte's loop takes `frames[i + 1]`: one frame too far. For joints 2 and 3 that's harmless (z1, z2, z3 are parallel); for the base it's a horizontal axis instead of the vertical one.
---
Take the axis from the same frame as the origin in the loop. Then check the home pose by hand: turning the base should move the wrist along +y at 0.7 m/s.
