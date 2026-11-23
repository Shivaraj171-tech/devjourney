**From:** Maya (Tech Lead)
**Ticket:** INC-310: Grabby-6 freezes mid-turn 🧊

Third time today: Grabby-6 starts turning a box on the packing table, tilts its wrist, and freezes with the box half turned. The motion controller's singularity monitor says "near singularity, motion FROZEN". Ops had to jog the arm out by hand each time.
The monitor (`vel/monitor.py`) is supposed to slow the arm down when the condition number κ of the Jacobian passes 50 and stop it above 200, because near the wrist flip joints 4 and 6 would need absurd speeds. But Rosa checked one of the frozen poses by hand and got κ = 14: a perfectly healthy wrist. Byte "optimised" the monitor this afternoon. Everything is in the Logs panel.
The 3D view replays the motion: the wrist tilting towards q5 = 0 while the planner asks for the same gentle spin. The charts show YOUR κ and the joint speeds the spin really needs.
