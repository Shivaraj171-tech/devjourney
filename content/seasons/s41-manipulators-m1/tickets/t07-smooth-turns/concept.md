**Slerp: blending orientations at constant speed**

**A straight line through a sphere**

Blending positions is easy: go a fraction t of the straight line. Blending orientations is not. Unit quaternions live on a sphere (in 4D, but a circle shows everything). The straight line between two points on a circle cuts **inside** it: midway the blend isn't unit length, so it isn't a rotation. Push it back out (normalise) and you get a valid rotation, but equal steps along the chord become **unequal** arcs: slow at the ends, fast in the middle.

Slerp (spherical linear interpolation, Shoemake 1985) walks along the arc itself, at a constant angular speed. It is the rotational version of "move in a straight line at constant speed".

**The angle from a dot product**

Step 1: the angle between q0 and q1 on the sphere comes from their dot product, like any two unit vectors:

```text
cos Ω = q0 · q1        (Ω is HALF the turn angle between the two orientations)
```

Step 2: look for q(t) = a q0 + b q1 that sits at angle tΩ from q0 and (1 - t)Ω from q1, in the plane of q0 and q1. Build a unit vector p in that plane perpendicular to q0: p = (q1 - cos Ω q0) / sin Ω. Then walking the arc is just a 2D turn:

```text
q(t) = cos(tΩ) q0 + sin(tΩ) p
```

Step 3: substitute p and simplify with sin(Ω - tΩ) = sin Ω cos tΩ - cos Ω sin tΩ:

```text
q(t) = [sin((1 - t)Ω) q0 + sin(tΩ) q1] / sin Ω
```

Angle grows linearly in t: constant speed, and |q(t)| = 1 for every t.

Step 4: compare with normalised lerp. The chord point (1 - t) q0 + t q1 sits at angle atan(t sin Ω / ((1 - t) + t cos Ω)) from q0: not linear in t. The bigger the turn, the worse. For a 160° turn (Ω = 80°) the eighth-steps are 15.6°, 18.8°, ... 23.7° instead of 20° each.

Step 5: double cover. q and -q are the same orientation, but on the sphere they're opposite points. If q0 · q1 < 0, the arc to q1 is longer than the arc to -q1 and the robot turns the long way (360° - 160° = 200°). So flip first: if the dot is negative, use -q1.

Step 6: when q0 ≈ q1, sin Ω ≈ 0 and step 3 divides by almost zero. There the sphere is flat and normalised lerp is accurate, so use it above a threshold (dot > 0.9995).

**Halfway through 160°, two ways**

Halfway through a 160° turn about z, with both methods, measured from the start:

```python
import math

half = math.radians(160) / 2
q0 = [1.0, 0.0, 0.0, 0.0]
q1 = [math.cos(half), 0.0, 0.0, math.sin(half)]
def turned(q):
    return round(math.degrees(2 * math.acos(abs(q[0]) / math.sqrt(sum(c * c for c in q)))), 1)
omega = math.acos(sum(a * b for a, b in zip(q0, q1)))
slerp = [(math.sin(0.75 * omega) * a + math.sin(0.25 * omega) * b) / math.sin(omega) for a, b in zip(q0, q1)]
lerp = [0.75 * a + 0.25 * b for a, b in zip(q0, q1)]
print(turned(slerp), turned(lerp))
# Output:
# 40.0 34.5
```

A quarter of the time should be a quarter of the turn: slerp gives 40°, lerp lags at 34.5° (and then rushes to catch up).

**The forgotten sign flip**

Forgetting the sign flip is invisible in most tests (cameras usually send q with w > 0), then one day the robot swings 200°. And normalised lerp is fine for small steps, which is why it survives code review.

**Two tests for an AI-written slerp**

Ask for t = 0.25 of a big turn (160°) and check it's exactly a quarter of the angle, then feed the same target as -q1: the answer must not change.
