**Euler angles (ZYX) and gimbal lock**

**Three numbers instead of nine**

Three numbers are friendlier than nine. Euler angles describe an orientation as three turns about main axes, in a fixed order. ZYX (yaw, pitch, roll) is the aircraft and robot convention: point the nose (yaw, about z), tip it up or down (pitch, about y), then roll about the nose itself (roll, about x).

Picture a camera on a three-ring gimbal: the outer ring yaws, the middle ring pitches, the inner ring rolls. Pitch the middle ring 90° and the inner (roll) axis swings round until it lines up with the outer (yaw) axis. Now two knobs turn the camera about the **same** axis, and no knob turns it about the third. You haven't lost a motor, you've lost a **direction**. That is gimbal lock: a property of the three-number description, not of the hardware alone.

**Roll, pitch, yaw, multiplied**

Step 1: compose. Turning about the world axes, roll first (x), then pitch (y), then yaw (z), puts the first turn on the right (ticket 2):

```text
R = Rz(ψ) Ry(θ) Rx(φ)          ψ = yaw, θ = pitch, φ = roll
```

Step 2: multiply it out (c = cos, s = sin):

```text
R = [[cψcθ,  cψsθsφ - sψcφ,  cψsθcφ + sψsφ],
     [sψcθ,  sψsθsφ + cψcφ,  sψsθcφ - cψsφ],
     [ -sθ,       cθsφ,           cθcφ     ]]
```

Step 3: read the angles back. The bottom-left entry is alone: R[2][0] = -sin θ, so θ = asin(-R[2][0]), always in [-90°, 90°]. Two entries in column 0 share cθ: R[1][0] / R[0][0] = sψ / cψ, so ψ = atan2(R[1][0], R[0][0]). In row 2: φ = atan2(R[2][1], R[2][2]). Use atan2, never atan, so the quadrant survives (when cθ > 0 the signs pass through).

Step 4: the lock. At θ = +90°, cθ = 0 and all four of those entries are 0: atan2(0, 0). Look at what's left instead. With sθ = 1, row 0 becomes:

```text
R[0][1] = cψsφ - sψcφ = -sin(ψ - φ)      R[1][1] = sψsφ + cψcφ = cos(ψ - φ)
```

Only the **difference** ψ - φ appears: infinitely many (yaw, roll) pairs give the same R. At θ = -90° it is ψ + φ. So we choose a convention, roll = 0, and give yaw the whole turn: ψ = atan2(-R[0][1], R[1][1]).

Near the lock it's bad too: a tiny turn of the box can need a huge jump in yaw and roll. Remember this shape of problem; in Module 3 you'll meet it again as a **singularity** of the Jacobian.

**Pitch 90°: two knobs, one motion**

Pitch 90°: yaw 40° and roll 0° gives the same matrix as yaw 0° and roll -40°.

```python
import math

def euler(yaw, pitch, roll):
    cy, sy, cp, sp = math.cos(yaw), math.sin(yaw), math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    return [[cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
            [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
            [-sp, cp * sr, cp * cr]]

a = euler(math.radians(40), math.pi / 2, 0.0)
b = euler(0.0, math.pi / 2, math.radians(-40))
print(max(abs(x - y) for ra, rb in zip(a, b) for x, y in zip(ra, rb)) < 1e-12)
# Output:
# True
```

**Rounding errors at the lock**

Floating point never gives exactly 0 at the lock: cos(π/2) is 6e-17, so atan2 of two rounding errors returns a confident, random angle. Test |cos θ| against a small threshold. And clamp before asin: rounding can make -R[2][0] = 1.0000000000000002, a math domain error.

**Round-trip the matrices, not the angles**

Round-trip every conversion an AI writes: angles → matrix → angles → matrix, and compare the **matrices**, including at pitch ±90°. Comparing the angles would wrongly fail at the lock, where many answers are right.
