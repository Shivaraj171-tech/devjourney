**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-403: Four ways to the same box 🔄

Module 2's 3-DOF arm (a turning base, a shoulder and an elbow) is back, and it needs IK. No new geometry: the base turns the arm to face the box, and then shoulder and elbow are ticket 2's two-link arm, in the vertical plane through the box. Turning the base the other way and reaching back over the shoulder works too, so every box in reach has four solutions.
Byte wired it up in `ik/rrr_ik.py`. It says "out of reach" for boxes Grabby obviously reaches, and the ones it does solve end up 30 cm too high.
The 3D view runs YOUR solver: four solutions to the same box, one after another.
