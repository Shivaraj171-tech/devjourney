**Homogeneous transforms: rotation and position in one 4x4 matrix**

**Intuition**

A box on the shelf has an orientation R (which way its axes point) and a position t (where its corner sits). A point written in the box's own frame, say "the handle, 10 cm along the box's x", is in the world at: turn it with the box, then shift it by where the box is. That's p_world = R p_box + t.

Turn-then-shift isn't a single matrix product (the "+ t" spoils it), which makes chaining many frames messy. The trick: add a fourth coordinate, always 1, to every point. Then the shift becomes part of a 4x4 matrix, and every pose, every chain and every inverse is plain matrix algebra.

**The maths**

Step 1, the matrix. Put R top-left, t in the last column, and [0, 0, 0, 1] at the bottom:

```text
T = [[R00, R01, R02, tx],        [p_world]   [R  t] [p_box]
     [R10, R11, R12, ty],        [   1   ] = [0  1] [  1  ]
     [R20, R21, R22, tz],
     [  0,   0,   0,  1]]
```

Multiply it out: the top three rows give R p_box + 1·t, and the bottom row gives 0 + 1 = 1. The 1 is what switches the translation on. (A direction, like an axis, gets a 0 instead: it turns but doesn't shift.)

Step 2, composition. Two moves in a row are one product, and the bottom row stays [0, 0, 0, 1]:

```text
[R1 t1] [R2 t2]   [R1R2   R1 t2 + t1]
[0  1 ] [0  1 ] = [ 0          1    ]
```

Step 3, the inverse. Solve p_world = R p_box + t for p_box. Subtract t, then undo the turn with R⁻¹ = Rᵀ (ticket 3):

```text
p_box = Rᵀ (p_world - t) = Rᵀ p_world - Rᵀ t
T⁻¹ = [[Rᵀ, -Rᵀ t],
       [0,     1  ]]
```

Check it with step 2: T T⁻¹ has rotation R Rᵀ = I and translation R(-Rᵀ t) + t = -t + t = 0. The identity.

Step 4, why the full transpose fails. Tᵀ puts tᵀ in the bottom row and zeros in the last column: it's not even a homogeneous transform. And the "almost right" -t (instead of -Rᵀ t) only works when R = I: it undoes the shift along the world axes when it must be undone along the box's turned axes.

**Worked example**

The box is turned 90° about z and sits at (0.6, 0.2, 0.3). Where is its handle (0.1, 0, 0 in the box frame), and does the inverse bring it back?

```python
R = [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
t = [0.6, 0.2, 0.3]
T = [R[0] + [t[0]], R[1] + [t[1]], R[2] + [t[2]], [0, 0, 0, 1]]
handle = [0.1, 0, 0, 1]
world = [round(sum(T[i][k] * handle[k] for k in range(4)), 3) for i in range(4)]
print(world)
Rt = [[R[j][i] for j in range(3)] for i in range(3)]
back_t = [-sum(Rt[i][k] * t[k] for k in range(3)) for i in range(3)]
print([round(v, 3) for v in back_t])
# Output:
# [0.6, 0.3, 0.3, 1.0]
# [-0.2, 0.6, -0.3]
```

The handle is 0.1 further along world y (the box's x points along y), and the inverse's translation is -Rᵀ t = (-0.2, 0.6, -0.3), not (-0.6, -0.2, -0.3).

**Watch out**

A transposed 4x4 doesn't crash: it just multiplies. Look at the bottom row: anything but [0, 0, 0, 1] means the matrix isn't a pose. And keep points as 4-vectors with a 1 (or use `T_apply`): forgetting the 1 silently drops the translation.

**AI check**

Check any AI-written inverse with T · T_inv(T) == I on a pose that has BOTH a rotation and a translation. A pure move or a pure turn lets the wrong formulas pass.
