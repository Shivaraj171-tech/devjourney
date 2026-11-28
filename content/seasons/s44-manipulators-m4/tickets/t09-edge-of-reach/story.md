**From:** Orbit Orders alerts (packing floor, paging: you)
**Ticket:** INC-410: Grabby-6 thrashes at tote 9 (boss incident)

INC-410 P1. Packing line STOPPED by the safety system.
Tote 9, far edge of Grabby-6's workspace.
Box #413: picked OK. Box #414: IK never converged, elbow flipping back and forth.
Iteration 19: joint 3 commanded to turn 4 radians in one step. Later steps: more than 9.
Last change: `ik/reach_edge.py`, the production UR5e solver, "simplified" by Byte this afternoon for "fewest iterations".
Logs: in the Logs panel.

**From:** Maya (Tech Lead)

Rosa thinks #414 is a centimetre beyond full stretch. Plain Newton can never solve that and never stops trying.
Put the robustness back with what you built in tickets 6 and 7: damped steps, clamped to MAX_STEP radians per joint. #413 must still be reached exactly. #414 must end up as close as the arm can get, calmly. The 3D view replays YOUR solver on #414, with the flange's velocity ellipsoid.
