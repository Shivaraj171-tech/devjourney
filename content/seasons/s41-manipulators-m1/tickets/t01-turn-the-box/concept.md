**2D rotation matrices: the columns are the turned axes**

**Intuition**

Stick a tiny pair of arrows on the box: x pointing right, y pointing up. Turning the box turns those arrows. Here is the key idea of this whole module: *if you know where the arrows end up, you know the turn*. Any point on the box is "a bit of x plus a bit of y", so once the two arrows are turned, every point follows.

A rotation matrix is just those two turned arrows written side by side, as **columns**.

**The maths**

Turn by an angle θ (radians, anticlockwise positive). Step 1: where does the x arrow (1, 0) go? It stays length 1 and now makes angle θ with the old x axis, so by the definition of cos and sin:

```text
x' = (cos θ, sin θ)
```

Step 2: the y arrow (0, 1) starts 90° ahead of x and stays 90° ahead, at angle θ + 90°. Using cos(θ + 90°) = -sin θ and sin(θ + 90°) = cos θ:

```text
y' = (-sin θ, cos θ)
```

Step 3: a point v = (a, b) means "a steps along x, b steps along y". After the turn it is a steps along x' and b steps along y':

```text
v' = a·x' + b·y' = (a cos θ - b sin θ,  a sin θ + b cos θ)
```

Step 4: write that as a matrix times a vector. The columns are x' and y':

```text
R(θ) = [[cos θ, -sin θ],
        [sin θ,  cos θ]]        v' = R(θ) v
```

Row 0 of R dotted with v gives the new x; row 1 gives the new y. Two checks you can always do in your head: R(0) is the identity, and R(90°) = [[0, -1], [1, 0]] sends (1, 0) to (0, 1).

Two more facts fall out. Lengths don't change (x' and y' are unit length and perpendicular). And turning back is the **transpose**: R(-θ) = R(θ)ᵀ, because cos(-θ) = cos θ and sin(-θ) = -sin θ. Keep that one: it is why rotations are so cheap to undo.

**Worked example**

The box's corner sits at (0.3, 0.2). Turn the box 30° anticlockwise:

```python
import math

t = math.radians(30)
R = [[math.cos(t), -math.sin(t)],
     [math.sin(t), math.cos(t)]]
corner = [0.3, 0.2]
new = [R[0][0] * corner[0] + R[0][1] * corner[1],
       R[1][0] * corner[0] + R[1][1] * corner[1]]
print([round(c, 3) for c in new])
print(round(math.hypot(*new), 3), round(math.hypot(*corner), 3))
# Output:
# [0.16, 0.323]
# 0.361 0.361
```

The corner moved up and left (anticlockwise) and stayed 0.361 m from the centre.

**Watch out**

If you write the turned axes as the **rows** instead of the columns, you get Rᵀ = R(-θ): a perfectly valid rotation, the wrong way round. Nothing crashes, lengths are kept, half the tests still pass. That is exactly the bug in this ticket. Also: `math.cos` wants radians.

**AI check**

When an AI hands you a rotation matrix, feed it the x axis (1, 0) and a 90° turn. The answer must be (0, 1), the first column. If it comes out (0, -1), it is turning clockwise: the matrix is transposed.
