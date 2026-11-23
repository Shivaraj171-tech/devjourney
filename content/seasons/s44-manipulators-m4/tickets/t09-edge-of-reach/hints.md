Read the log from the deploy line down: box #413 (reachable) works, #414 thrashes, and the elbow keeps flipping between +21° and -55°. Look at q3 at iteration 18: almost exactly 0. What is the UR5e's Jacobian like there, and what does plain Newton's step do with it?
---
#414 is about 1 cm beyond full stretch: no exact solution, and the arm is at its elbow singularity. Plain Newton's step `solve(J_b, V)` scales the stretched direction by 1/σ, which explodes. The file still has everything for the cure: `dls_step` (damping, ticket 7), `clamp_step` and the constants LAMBDA and MAX_STEP.
---
In `reach`, replace the plain Newton step with a damped step (`dls_step` with LAMBDA), then pass it through `clamp_step`. Then read the 3D view: the arm should stretch towards #414 and settle there, about 1 cm short.
