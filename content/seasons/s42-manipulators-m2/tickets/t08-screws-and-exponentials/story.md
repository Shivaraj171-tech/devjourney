**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-208: No frames on the links

DH makes you place a frame on every link, with strict rules, before you can write a single number. Modern robotics (Lynch and Park's *Modern Robotics*, and most new robot software) uses another way: the **product of exponentials** (PoE). You only need two things, both measured with the arm at home: where the gripper is (M), and where each joint's axis is, as a **screw axis** S = (ω, v) in the base frame. No link frames at all.
`kin/poe.py` has `revolute_screw`, `exp_twist` (the matrix exponential of a twist, built on Module 1's Rodrigues) and `fk_poe`. Byte wrote `exp_twist`: the rotation part is right, and slides work. But a joint whose axis doesn't pass through the origin carries things to the wrong place, and the 3D view's version of ticket 3's arm comes apart.
