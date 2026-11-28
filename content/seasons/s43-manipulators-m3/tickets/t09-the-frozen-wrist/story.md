**From:** Orbit Orders alerts (packing floor, paging: you)
**Ticket:** INC-310: Grabby-6 freezes mid-turn

INC-310 P2. Third freeze today.
Grabby-6 turning a box on the packing table, wrist tilting. Froze with the box half turned.
Singularity monitor: "near singularity, motion FROZEN".
Ops jogged the arm out by hand each time.
Last change: `vel/monitor.py`, "optimised" by Byte this afternoon.
Logs: in the Logs panel.

**From:** Maya (Tech Lead)

The monitor should slow the arm when the Jacobian's condition number κ passes 50, and stop it above 200, because near the wrist flip joints 4 and 6 would need absurd speeds. Rosa checked one frozen pose by hand: κ = 14. A healthy wrist.
The 3D view replays the motion, the wrist tilting towards q5 = 0 while the planner asks for the same gentle spin. The charts show YOUR κ and the joint speeds the spin really needs.
