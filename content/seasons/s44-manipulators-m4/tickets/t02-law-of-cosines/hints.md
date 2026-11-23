Two bugs. Elbow up misses the box while elbow down hits it: the bend q2 has the right sign, so look at how q1 is corrected. And for the far box, print c2: it comes out 1.0000000000000002.
---
β = atan2(l2 s2, l1 + l2 c2) must use s2 WITH its sign (the lesson's Step 3): Byte uses abs(s2), which is right for elbow down only. And `abs(c2) > 1` rejects a box that is reachable up to rounding (Step 5).
---
Use the signed s2 in the shoulder correction. For the edge: reject only when |c2| exceeds 1 by more than a tiny tolerance, then clamp c2 into [-1, 1] before taking the square root.
