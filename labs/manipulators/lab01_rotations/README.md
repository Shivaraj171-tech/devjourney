# Lab 01 · Rotation matrices and SO(3)

Module 1 (rigid-body motion) · 100 XP · browser twin: Module 1 of the web track

## Intuition

Glue three unit arrows (x, y, z) to the robot's gripper. A rotation is fully
described by *where those three arrows point*, written in the coordinates of a
fixed reference frame `s`. Stack them as columns and you have the rotation
matrix:

    R_sb = [ x_b  y_b  z_b ]      (each column is a body axis written in frame s)

Because the arrows stay unit length and mutually perpendicular, and because a
real rotation can't turn a right hand into a left hand, every rotation matrix
satisfies two constraints. The set of all such matrices is called **SO(3)**,
the *special orthogonal group*.

## Key maths, step by step

**1. Orthonormality.** Column i dotted with column j is `x_i . x_j`, which is 1
when i = j and 0 otherwise. In matrix form that whole table of dot products is
`R^T R`, so

    R^T R = I    =>    R^{-1} = R^T        (inverting a rotation is free: transpose)

**2. Right-handedness.** `det R = x . (y × z)`. For a right-handed frame
`y × z = x`, so `det R = x . x = +1`. A mirror has det = -1: it is orthonormal
but *not* in SO(3).

**3. Elementary rotations.** Rotating by θ about z: x goes to (cos θ, sin θ, 0),
y goes to (-sin θ, cos θ, 0), z stays put. Those are the columns:

    Rz(θ) = [[c, -s, 0],
             [s,  c, 0],
             [0,  0, 1]]

Rx and Ry follow by cycling the axes x -> y -> z -> x. For Ry the cyclic pair
is (z, x), which is why the minus sign sits in the *bottom-left*:

    Ry(θ) = [[ c, 0, s],
             [ 0, 1, 0],
             [-s, 0, c]]

**4. The subscript cancellation rule.** `R_sb` maps coordinates in b to
coordinates in s: `v_s = R_sb v_b`. Chaining frames cancels inner subscripts:

    R_sc = R_sb R_bc,       R_bs = R_sb^{-1} = R_sb^T,       R_ab = R_as R_sb = R_sa^T R_sb

**5. The skew-symmetric matrix [w].** The cross product is linear in its second
argument, so it is a matrix: `w × v = [w] v` with

    [w] = [[  0, -wz,  wy],
           [ wz,   0, -wx],
           [-wy,  wx,   0]]        [w]^T = -[w]

Why it matters: differentiate `R^T R = I` to get `Ṙ^T R + R^T Ṙ = 0`, i.e.
`R^T Ṙ` is skew-symmetric. So `Ṙ = R [w_b]` for some vector w_b — the angular
velocity. The set of skew matrices is called **so(3)**. You'll need [w] in every
lab from here on.

**6. Drift and projection.** Multiply many rotations in floating point and R
slowly stops being orthonormal. The closest rotation in the Frobenius norm comes
from the SVD `M = U Σ V^T`: replace Σ by I, giving `U V^T`. If `det(U V^T) = -1`
you have a mirror; flip the last singular direction: `U diag(1, 1, -1) V^T`.

## Task

Implement in `starter.py`: `rot_x`, `rot_y`, `rot_z`, `is_rotation_matrix`,
`project_to_so3`, `skew`, `vee`, `relative_rotation`.

    python -m labs.manipulators check lab01
    python -m labs.manipulators hint lab01      # staged hints, cost XP

Stretch (no tests): multiply 10 000 small random rotations and watch
`np.linalg.norm(R.T @ R - I)` grow; then project every 100 steps.
