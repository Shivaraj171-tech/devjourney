**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-208: No frames on the links

DH makes you place a frame on every link, by strict rules, before you write a single number. Lynch and Park's *Modern Robotics*, and a lot of newer robot software, use another way: the **product of exponentials** (PoE). You need two things, both measured with the arm at home: where the gripper is (M), and where each joint's axis is, as a **screw axis** S = (ω, v) in the base frame. No link frames.
`kin/poe.py` has `revolute_screw`, `exp_twist` (the matrix exponential of a twist, built on Module 1's Rodrigues) and `fk_poe`. Byte wrote `exp_twist`. At home everything lines up. As soon as the joints turn, the 3D view's version of ticket 3's arm comes apart.
