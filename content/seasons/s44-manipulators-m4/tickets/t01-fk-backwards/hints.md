Two different failures. The point (0.05, 0) is closer to the shoulder than the forearm can fold back to. The point at exactly 0.9 m is reached only stretched out. Sketch the triangle shoulder-elbow-gripper for each: how many ways can it be drawn?
---
The reachable set is a RING, |l1 - l2| <= r <= l1 + l2 (the lesson's Step 2): Byte only checks the outer edge. And on either edge the triangle is flat, so the two elbows coincide: ONE solution, not two (Step 3).
---
Return 0 when r is outside the ring on either side, 1 when r is on either edge (within tol), and 2 otherwise. Keep the infinitely-many case first.
