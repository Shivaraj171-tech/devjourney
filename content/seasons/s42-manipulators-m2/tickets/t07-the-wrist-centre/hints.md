The home-pose test passes and the random poses fail: so the formula p_w = p - d6 z6 is right in spirit, and something about z6 is only right at special poses. Where does `wrist_center` get z6 from?
---
z6 is the flange's z axis in the base frame. In a rotation matrix the turned axes are the COLUMNS (Module 1, ticket 1). `T_0_6[2]` is the third ROW: the z components of x6, y6 and z6, not z6 itself.
---
Build z6 from the third column of T_0_6: element 2 of rows 0, 1 and 2. The rest of the function is already right.
