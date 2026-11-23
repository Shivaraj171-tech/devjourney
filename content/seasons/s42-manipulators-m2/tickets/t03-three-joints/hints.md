The home-pose test passes and every other one fails. At home all three joint turns are zero, so any order of the same transforms lands on the same point. Look at the order `rrr_fk` multiplies the links in.
---
Use the naming rule from Module 1: T_0_1 T_1_2 T_2_3 = T_0_3, the touching names cancel. `reversed(...)` builds T_2_3 T_1_2 T_0_1, where nothing touches. Byte's comment mixes up "the order a point's coordinates are converted in" with "the order of the chain".
---
`rrr_links` already returns `[T_0_1, T_1_2, T_2_3]` in base-to-wrist order. Pass them to `chain` in that order (drop one function call), and update the docstring so the next reader isn't misled.
