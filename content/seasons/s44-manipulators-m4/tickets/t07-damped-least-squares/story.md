**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-407: Newton's bad day 💥

Ticket 5's Newton is fast when the box is comfortably in reach. Today a box slid to the far side of the conveyor, 5 cm beyond Grabby's reach, and Newton went berserk: steps of 170 radians, the arm whirling, the error jumping between 5 cm and a metre. Near full stretch the Jacobian is almost singular (Module 3, ticket 6), and J⁻¹ e asks for absurd joint speeds.
The cure is damped least squares: instead of insisting on J dq = e exactly, find the step that gets close to e while staying small. `ik/dls.py` has the function, `dls_step`. Byte wrote it, and it passed every test for boxes in reach.
The 3D view replays YOUR solver reaching for the box out of reach, with the arm's velocity ellipsoid at the wrist. The chart compares your error with plain Newton's on the same box.
