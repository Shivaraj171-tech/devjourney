Two separate problems. Start with the ordinary angles: build R for a pure pitch of 30° and look at R[2][0]. Is it +sin(30°) or -sin(30°)? Now read the line that computes pitch. Then look at the 3D view of the gimbal-lock round trip: the rebuilt box ends far from the dashed pose.
---
The lesson writes R out in full: R[2][0] = -sin(pitch), so pitch = asin(-R[2][0]). At pitch ±90° every entry that yaw and roll are read from (R[1][0], R[0][0], R[2][1], R[2][2]) is 0 times something, so atan2 gets two tiny rounding errors and returns a random angle. You need a separate branch for that case.
---
After computing pitch, check `abs(math.cos(pitch)) < LOCK`. In that branch yaw and roll can't be separated, so choose roll = 0.0 and read yaw from entries that are still alive at the lock: the lesson shows R[0][1] = -sin(yaw - roll) and R[1][1] = cos(yaw - roll) there (with + instead of - at pitch -90°). Which atan2 gives yaw when roll is 0?
