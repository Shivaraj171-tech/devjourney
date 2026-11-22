Two checks fail, on two different functions. Read `reachable`: it refuses boxes that are too far. What about a box at (0.1, 0.05), only 11 cm from the shoulder? `inverse()` can't solve that triangle, so it crashes. Then read `within_limits`: which joints does it look at?
---
The ring of reach has an inner edge too: the forearm folded back over the upper arm reaches `abs(UPPER_ARM - FOREARM)` = 0.2 m from the shoulder, never closer. And `within_limits` only checks the shoulder, so an elbow at 147° slips through.
---
In `reachable`, the distance must be at least the inner radius AND at most the outer one (Python can chain `a <= d <= b`). In `within_limits`, work out `shoulder_ok` the way it does now, then an `elbow_ok` the same way from `ELBOW_LIMITS`. What should the function return from those two?
