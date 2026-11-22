**Quaternions: rotations in four numbers**

**Intuition**

Axis-angle is the most natural description (ticket 5), but two axis-angles can't be combined directly, and a matrix uses nine numbers for three degrees of freedom. A unit quaternion packs the axis and the angle into four numbers in a way that **multiplies** like rotations do: combining two turns is one product, 16 multiplications. No gimbal lock, and a drifted one is easy to repair (divide by its length).

Think of q as "how much NOT to turn" (w = cos θ/2) plus "which way, and how much" (the vector part, sin θ/2 · u).

**The maths**

Step 1, the definition. A turn of θ about the unit axis u is

```text
q = (w, x, y, z) = (cos θ/2,  sin θ/2 · ux,  sin θ/2 · uy,  sin θ/2 · uz)
```

Its length is cos²(θ/2) + sin²(θ/2) = 1: rotations live on the unit sphere in 4D. Note q and -q give the same rotation (θ + 360° flips both signs).

Step 2, the product. Write q = (w, v) with v the vector part. Hamilton's rule:

```text
(w1, v1)(w2, v2) = (w1 w2 - v1·v2,   w1 v2 + w2 v1 + v1 × v2)
```

The cross product makes it non-commutative, exactly like 3D rotations. Like matrices, q1 q2 means "q2 first, then q1".

Step 3, rotating a vector. Put v in a quaternion with w = 0 and sandwich it, using the conjugate q* = (w, -v), the inverse of a unit q:

```text
v' = q (0, v) q*
```

q appears **twice**, and each copy turns v by θ/2. That is the reason for the half angle in step 1. (Expand it and you get exactly Rodrigues' formula from ticket 5.)

Step 4, integrating a gyro. If the wrist spins with angular velocity ω (rad/s, world axes), then dq/dt = ½ (0, ω) q. A first-order step is q ← q + ½ (0, ω) q · dt. That added piece is perpendicular to q in 4D, so by Pythagoras each step makes q slightly longer:

```text
|q_new|² = |q|² (1 + (|ω| dt / 2)²)
```

With |ω| = 2 rad/s and dt = 0.01 s that's 1.0001 per step: after 1000 steps |q|² ≈ 1.105. And q (0, v) q* scales v by |q|², so the box "grows" 10%. Fix: **renormalise** q = q / |q| after every step. Projecting back onto the sphere is cheap and keeps the direction.

**Worked example**

A quarter turn about z sends x to y:

```python
import math

def mul(a, b):
    aw, ax, ay, az = a
    bw, bx, by, bz = b
    return [aw * bw - ax * bx - ay * by - az * bz,
            aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw]

h = math.radians(90) / 2
q = [math.cos(h), 0.0, 0.0, math.sin(h)]
q_conj = [q[0], -q[1], -q[2], -q[3]]
v = mul(mul(q, [0.0, 1.0, 0.0, 0.0]), q_conj)
print([round(c, 6) + 0 for c in v])
# Output:
# [0.0, 0.0, 1.0, 0.0]
```

The result is (0, x, y, z) = (0, 0, 1, 0): the y axis.

**Watch out**

Using the full angle in cos and sin gives a turn of 2θ: everything still runs, nothing crashes. Drift is the other silent bug: it is tiny per step, so short tests pass and only long runs fail. Robots run for hours.

**AI check**

Check an AI's quaternion code with a 90° turn about z (must send x to y, and q must be (0.707, 0, 0, 0.707)), and with a long loop: |q| after 10,000 steps must still be 1.
