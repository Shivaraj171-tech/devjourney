Two bugs, two functions. For `joint_distance`: what does Byte's formula give for [1, 2] versus [0, 3]? For `within_limits`: which end of each range does it check?
---
A joint-space distance must be a norm: differences of opposite signs must not cancel, and the "closest" must not be the most negative sum (the lesson's Step 2). And a limit has two ends: low <= q_i <= high (Step 1).
---
Square the differences (then take the square root) in `joint_distance`, and test both bounds in `within_limits`. `pick_solution` itself is fine once its two helpers are.
