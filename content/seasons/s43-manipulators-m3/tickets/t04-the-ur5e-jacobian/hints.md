Start with `test_checker_on_a_known_motion`: a "robot" that spins its flange about the base's z axis at 1 rad/s. You know the answer without any code: w = (0, 0, 1). What does the checker say? If the checker fails a case you can do in your head, it is the checker that's wrong, not the Jacobian.
---
dR/dt = [w] R with w in the BASE frame, so [w] = (dR/dt) Rᵀ. Byte multiplies the other way round, Rᵀ (dR/dt): that's the same spin written in the flange's own axes (the lesson's Step 3). It agrees with the base frame only when the flange isn't turned.
---
Swap the order of the two factors in the line that computes w. Leave `ur5e_jacobian` alone: it was right all along.
