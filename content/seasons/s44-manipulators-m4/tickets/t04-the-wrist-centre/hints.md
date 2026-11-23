The "pick, straight down" pose passes and the tilted ones fail. What does Byte's wrist_center_of assume about which way the gripper points?
---
The wrist centre is D6 behind the flange along the flange's OWN approach axis z6, the third column of the target's rotation (the lesson's Step 1). Byte always backs off along the base's z axis: right only when z6 = (0, 0, -1).
---
Read z6 from the target T, then step back D6 along it from the flange position. Then check the lesson's worked example by hand: a gripper pointing along +x.
