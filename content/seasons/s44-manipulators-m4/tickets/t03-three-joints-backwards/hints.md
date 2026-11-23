The solutions that do exist put the wrist exactly 0.3 m too high, and 0.3 m is a number you've seen in kin/rrr.py. Where does the planar two-link arm start: at the base, or at the shoulder?
---
The shoulder and elbow solve a planar problem measured from the SHOULDER, D1 above the base (the lesson's Step 2). Byte's s = z measures the height from the floor, so every target looks D1 higher than it is.
---
Measure the in-plane height from the shoulder in `rrr_ik`. Leave q1 and r alone: the base turn doesn't care about heights.
