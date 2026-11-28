**Rotations about x, y and z, and what makes a matrix a rotation**

**The flat turn, in three planes**

Every 3D turn about a main axis is the flat 2D turn from ticket 1, happening in the plane **perpendicular** to that axis, while the axis itself stays put. Turn about z and x, y swing around in the floor plane. Turn about x and y, z swing in the wall plane. Which way is positive? The **right-hand rule**: thumb along the axis, fingers curl the positive way.

And the safety check: a rotation must keep lengths and right angles, **and** keep the frame right-handed. A mirror keeps lengths and angles but swaps handedness, like your left hand in a mirror becoming a right hand. No physical turn can do that.

**Columns for x, y and z**

Same recipe as ticket 1: the columns are where x, y, z go. About z, x → (cos θ, sin θ, 0), y → (-sin θ, cos θ, 0), z stays:

```text
Rz(θ) = [[cos θ, -sin θ, 0],
         [sin θ,  cos θ, 0],
         [  0,      0,   1]]
```

About x, the turning plane is y-z, with y towards z:

```text
Rx(θ) = [[1,   0,      0  ],
         [0, cos θ, -sin θ],
         [0, sin θ,  cos θ]]
```

About y, the right-hand rule says the positive turn takes **z towards x** (cyclic order x → y → z → x: about y, the pair is (z, x)). So z → (sin θ, 0, cos θ) and x → (cos θ, 0, -sin θ):

```text
Ry(θ) = [[ cos θ, 0, sin θ],
         [   0,   1,   0  ],
         [-sin θ, 0, cos θ]]
```

The minus sign sits in the bottom-left for Ry, unlike the other two. That's not a typo, it's the cyclic order.

What makes R a rotation? Step 1: its columns c₀, c₁, c₂ are the turned axes, so they must be unit length and perpendicular: cᵢ·cⱼ = 1 if i = j, else 0. Step 2: entry (i, j) of RᵀR is exactly cᵢ·cⱼ, so that condition is

```text
Rᵀ R = I        (orthonormal; so R⁻¹ = Rᵀ)
```

Step 3: taking determinants, det(Rᵀ) det(R) = det(I) = 1, so det(R)² = 1: det(R) is +1 or -1. Step 4: det(R) = c₀ · (c₁ × c₂) is the signed volume of the turned unit cube. +1 means x × y still equals z (right-handed). -1 means a mirror. A proper rotation needs both: **RᵀR = I and det(R) = +1**. Mathematicians call the set of these SO(3).

**The mirror that passes half the test**

The mirror that flips z passes the orthonormal test but not the determinant:

```python
M = [[1, 0, 0], [0, 1, 0], [0, 0, -1]]
cols = [[M[r][c] for r in range(3)] for c in range(3)]
dots = [[sum(a * b for a, b in zip(ci, cj)) for cj in cols] for ci in cols]
print(dots)
det = (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
       - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
       + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))
print(det)
# Output:
# [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
# -1
```

**Ry's signs are the odd ones out**

Copying the sign pattern of Rx or Rz into Ry gives Ry(-θ): still orthonormal with det +1, so `is_rotation` can't catch it. Only a direction test can (rot_y(90°) must send z to x). And checking `abs(det) == 1` lets mirrors through: the sign is the whole point.

**The right-hand rule, then is_rotation**

For any rotation an AI writes, check one axis with the right-hand rule (a quarter turn about y sends z to x) and run your `is_rotation` on a mirror: it must say no.
