# Lab 06 · Forward kinematics with Denavit-Hartenberg

Module 2 (forward kinematics) · 150 XP · browser twin: Module 2 of the web track

## Intuition

Forward kinematics (FK) answers: *given the joint angles q, where is the
gripper?* A serial arm is a chain of rigid links joined by motors, so the answer
is a chain of transforms (lab 05): `T_0n(q) = T_01(q1) T_12(q2) … T_{n−1,n}(qn)`.

The only question is how to describe each link transform. A general pose needs
6 numbers. Denavit and Hartenberg (1955) noticed that if you are clever about
**where you put each frame**, 4 numbers suffice, and only one of them changes
with the joint. That's the DH table every robot datasheet ships with.

## Key maths, step by step

**1. The frame rules (standard / "distal" DH).**
- z_{i−1} is the axis of joint i (the joint spins frame i about z_{i−1}).
- x_i is the common normal from z_{i−1} to z_i (perpendicular to both).
- y_i completes a right-handed frame.

**2. Four moves from frame i−1 to frame i.** With those rules, you get from
frame i−1 to frame i by: rotate θ_i about z_{i−1}, slide d_i along z_{i−1},
slide a_i along the new x, rotate α_i about the new x:

    T_{i−1,i} = Rz(θᵢ) · Tz(dᵢ) · Tx(aᵢ) · Rx(αᵢ)

Multiply it out (c/s of θ and α):

    [[cθ, −sθ cα,  sθ sα, a cθ],
     [sθ,  cθ cα, −cθ sα, a sθ],
     [ 0,     sα,     cα,    d],
     [ 0,      0,      0,    1]]

- θᵢ: joint angle (variable for a revolute joint; = qᵢ + offset)
- dᵢ: offset along the previous z (link offset)
- aᵢ: length of the common normal (link length)
- αᵢ: twist between consecutive joint axes

Rz and Tz commute (same axis), as do Tx and Rx, so only the "z-group before
x-group" order matters.

**3. FK.** Accumulate: T_00 = I, T_0i = T_0,i−1 · T_{i−1,i}(qᵢ). Keep all
intermediate frames: you'll need them for plotting and, in Module 3, for the
Jacobian (each z_{i−1} is a joint axis).

**4. The 3-DOF arm (derive the table, then the closed form).**
Base yaw joint (vertical axis), shoulder at height d₁ = 0.30, upper arm a₂ = 0.40,
forearm a₃ = 0.30; shoulder and elbow axes are horizontal and parallel.
- Joint 1 axis is z₀ (vertical). Joint 2's axis is horizontal: going from z₀ to
  z₁ is a twist of 90° about x₁, so α₁ = π/2, and the shoulder sits d₁ up: d₁ = 0.30, a₁ = 0.
- Joints 2 and 3 are parallel (α = 0), separated by the upper arm: a₂ = 0.40.
- The tool frame sits at the end of the forearm: a₃ = 0.30, α₃ = 0.

Geometry check: in the vertical plane rotated by q₁, the arm is a planar 2R:
horizontal reach r = a₂cos q₂ + a₃cos(q₂+q₃), height z = d₁ + a₂ sin q₂ + a₃ sin(q₂+q₃),
and the plane turns about z: p = (r cos q₁, r sin q₁, z). Your DH FK must agree.

**5. A real 6-DOF arm: the UR5.** The table in `toolbox/robots.py` is Universal
Robots' own (source URL in the file). Read it at q = 0: all θ = 0 so every link
lies along ±x, giving x = a₂ + a₃ = −0.817, y = −(d₄ + d₆), z = d₁ − d₅. A test
checks that you get this.

DH pitfalls: *modified* DH (Craig) puts the frame at the *proximal* end and
multiplies Rx(α_{i−1}) Tx(a_{i−1}) Rz(θᵢ) Tz(dᵢ). Tables are not interchangeable.
Always check which convention a datasheet uses.

## Task

Fill in `ARM3_DH`, then implement `dh_transform`, `fk_dh_frames`, `fk_dh`,
`arm3_position`.

    python -m labs.manipulators check lab06
    python -m labs.manipulators visual lab06    # 3D stick figure of the UR5 and the 3-DOF arm
