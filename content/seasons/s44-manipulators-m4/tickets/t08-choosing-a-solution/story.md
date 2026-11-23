**From:** Maya (Tech Lead)
**Ticket:** MAN-408: Why the big swing? 🌀

Ops sent a video: Grabby, hovering two centimetres above a box, swung its whole arm up and over to pick it with the elbow the other way. Correct pose, scary motion, and it clipped the light curtain. The IK (ticket 3) returns all four solutions; `ik/choose.py` picks one: drop those outside the joint limits, then take the closest to where the arm already is.
Byte's "closest" adds up the joint differences, and its limit check only looks at one end of each range. The 3D view shows all four solutions' elbows with their distances from the current pose, then YOUR choice.
Please make the arm take the short way, and keep it inside its limits.
