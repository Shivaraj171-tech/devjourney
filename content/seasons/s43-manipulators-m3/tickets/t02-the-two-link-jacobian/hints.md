The failing test prints both matrices at q = (0.3, 0.9). The first pose in POSES has q1 = 0 and passes. What is special about q1 = 0 for a formula that mixes up two angles?
---
q2 is measured from the upper arm, so the forearm points at q1 + q2 in the base frame (the lesson's Step 1). Byte's `s12, c12` use q2 alone: right only when q1 = 0.
---
Compute s12 and c12 from the forearm's absolute angle. Then check the determinant by hand at one pose: l1 l2 sin(q2).
