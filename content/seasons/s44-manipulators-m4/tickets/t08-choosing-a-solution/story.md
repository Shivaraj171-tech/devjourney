**From:** Maya (Tech Lead)
**Ticket:** MAN-408: Why the big swing?

Ops sent a video. Grabby, two centimetres above a box, swung its whole arm up and over to pick it with the elbow the other way. Right pose, scary motion. It clipped the light curtain.
The IK (ticket 3) returns all four solutions. `ik/choose.py` picks one: drop those outside the joint limits, then take the one closest to where the arm already is. Byte wrote `ik/choose.py`.
The 3D view shows all four solutions' elbows with their distances from the current pose, then YOUR choice.
Make the arm take the short way, and keep it inside its limits.
