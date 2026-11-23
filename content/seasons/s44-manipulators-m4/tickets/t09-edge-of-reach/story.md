**From:** Maya (Tech Lead)
**Ticket:** INC-410: Grabby-6 thrashes at tote 9 🚨 (boss incident)

Tote 9 sits at the far edge of Grabby-6's workspace. Box #413 was picked fine, its neighbour #414 was not: the IK never converged, the elbow flipped back and forth, and on iteration 19 it commanded joint 3 to turn 24 radians in a single step. The safety system rejected the result and stopped the line. Everything is in the Logs panel.
This afternoon Byte "simplified" `ik/reach_edge.py`, our production UR5 solver: plain Newton steps, "fewest iterations", the damping and the step clamp removed. Rosa thinks #414 is a centimetre beyond full stretch, which plain Newton can never solve and never stops trying to.
Put the robustness back, using what you built in tickets 6 and 7: damped steps, clamped to MAX_STEP radians per joint. #413 must still be reached exactly; #414 must end up as close as the arm can get, calmly. The 3D view replays YOUR solver on #414, with the flange's velocity ellipsoid.
