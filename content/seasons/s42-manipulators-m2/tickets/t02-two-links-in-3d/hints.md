Each link transform is written in the frame of the joint BEFORE it: T_1_2 is "where the tip is, as the elbow sees it". Byte's draft returns them unchanged, so the second one is drawn as if it started at the base. The elbow test passes only because T_0_1 is already in the base frame.
---
The frame of joint k in the base is the running product T_0_1 T_1_2 ... T_(k-1)_k. Keep a running transform that starts as the identity (`identity(4)` is imported), multiply each link onto its RIGHT, and append the running transform after each step.
---
Inside the loop: `T = T_mul(T, link)`, then append `T`. Before the loop you still need to create T: which 4x4 changes nothing when you multiply by it?
