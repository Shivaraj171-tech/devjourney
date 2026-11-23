# Lab 24 · Task-space control

Module 7 (control) · 220 XP · browser twin: Module 7 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Labs 21–23 controlled *joints*. But the task lives where the gripper is: "go 10 cm
left, tilt 20°". Lab 11 answered that kinematically (resolved rates through the
inverse Jacobian). Now we answer it with **forces**.

Imagine a spring stretched between the gripper and the target, plus a damper.
That virtual spring would pull with a force F = Kp e − Kd ẋ. The joints can't
feel F directly, but lab 09 already gives the exchange rate between forces and torques:
by virtual work (power is the same in both coordinates, Fᵀ ẋ = Fᵀ J q̇ = τᵀ q̇),

    τ = Jᵀ F

So **Jacobian-transpose control**, τ = Jᵀ(Kp e − Kd ẋ) + g(q), needs no inverse at
all. It's well behaved at singularities and is lab 25's impedance controller in disguise. Its
weakness is that the spring pulls on an end effector whose *apparent mass* differs from
direction to direction, so the hand curves on its way to the target. **Operational space
control** (Khatib, 1987) fixes that by asking for a task-space *acceleration*
and paying for it with the task-space mass matrix Λ. The hand then moves almost
straight. We do both on the 2R arm and the 3-DOF arm, then a full **pose** (position and
orientation) on the UR5.

## Key maths, step by step

**1. Task coordinates.** For the 2R arm the task is the tip x = (x, z) = l₁(c₁, s₁) + l₂(c₁₂, s₁₂),
with J = ∂x/∂q (2×2). For a 3D arm, x is the end-effector position, and
J = Jv, the top 3 rows of lab 09's geometric Jacobian [Jv; Jw].

**2. Jacobian transpose.** τ = Jᵀ(Kp e − Kd J q̇) + g(q), with e = x_d − x and ẋ = J q̇.
Why it's stable: lab 22's argument with V = ½q̇ᵀMq̇ + ½eᵀKp e (spring energy now stored in
*task* space) gives V̇ = −ẋᵀ Kd ẋ ≤ 0. At rest Jᵀ Kp e = 0, so e = 0 whenever J has full
row rank. Near a singularity, Jᵀ just stops pushing in the lost direction. It doesn't blow up.

**3. Operational space.** Task-space dynamics: differentiate ẋ = J q̇ to get
ẍ = J q̈ + J̇ q̇, and substitute q̈ = M⁻¹(τ − b). With τ = Jᵀ F + g,

    ẍ = J M⁻¹ Jᵀ F + (terms in q̇)

So Λ⁻¹ = J M⁻¹ Jᵀ maps force to acceleration: **Λ = (J M⁻¹ Jᵀ)⁻¹ is the inertia the hand
feels** (heavy along the arm's length, light across it). To get a commanded
acceleration a = Kp e − Kd ẋ in *every* direction alike, push with F = Λ a:

    τ = Jᵀ Λ (Kp e − Kd J q̇) + g(q)

Each task direction now responds like the same unit-mass spring–damper, so the error
shrinks along the straight line towards the target. (The full law adds
Λ(J̇q̇) and the task-space Coriolis term. They're quadratic in velocity, and we leave them
out, which is why the path isn't *perfectly* straight. Kp, Kd here have units 1/s², 1/s.)

**4. Orientation error.** Position errors subtract; rotations don't. Use lab 03's
logarithm: the rotation still to go, from R to R_d and expressed in **world axes**,
is

    e_ω = log(R_d Rᵀ)          (because R_d = exp([e_ω]) R)

It matches Jw, which is also in world axes. Stack it below the position error as
e = [p_d − p; e_ω], the same order as [Jv; Jw], and the 6×6 Jacobian does the rest. For small
errors e_ω ≈ the angular displacement, so Kp e_ω behaves like a torsional spring. (Labs 13–15
used the *body* twist log(T_sb⁻¹T_sd) with the body Jacobian. The two are equivalent;
here we pick world frames to match [Jv; Jw].)

**5. Null space (brief).** With more joints than task dimensions (UR5, position
only: 6 > 3), some torques move the elbow without disturbing the hand. The
**dynamically consistent** projector

    N = I − Jᵀ J̄ᵀ,     J̄ = M⁻¹ Jᵀ Λ

passes only those: J M⁻¹ (N τ₀) = 0, i.e. no hand acceleration. Then τ = Jᵀ F + N τ₀ + g
lets a secondary goal τ₀ (stay near a comfortable posture, avoid a joint limit) run
underneath the primary task. With M⁻¹ in the definition (not just any pseudo-inverse),
the secondary torque produces no hand *acceleration*, not merely no static force.

**6. Fast dynamics for the UR5.** OSC needs M(q) every step. Lab 19's RNEA gives it
in ~2 ms of numpy on the UR5, which is too slow for a 500 Hz loop in a test. `toolbox.sim.MujocoDynamics`
asks MuJoCo for the same M(q) and g(q) (`mj_fullM`, `qfrc_bias`) in microseconds. We
checked it against your RNEA: they agree to 2×10⁻¹⁵.

## What we measured

2R arm (numpy RK4, 1 ms), from the tip at (1.49, 0.04) to (1.2, 0.6), Kp = 100, Kd = 20
(N/m and N s/m for Jᵀ; 1/s² and 1/s for OSC):

| law | reaches target (3 s) | max deviation from the straight line |
|---|---|---|
| Jacobian transpose | 4×10⁻⁸ m | 31 mm |
| operational space | 4×10⁻¹² m | 12 mm |

On the long, fast moves in the visual, OSC bends almost as much as Jᵀ: there the
velocity terms we dropped in step 3 are large. Putting them back,
τ = Jᵀ Λ (a − J̇ q̇) + C q̇ + g, makes ẍ = a exact for a non-redundant arm (try it).

3-DOF arm in MuJoCo (2 ms steps, RNEA gravity, Kp = 300 N/m, Kd = 40 N s/m, a 22 cm move):
Jᵀ reaches 2×10⁻⁷ m in 1.5 s with an 11.5 mm detour; OSC (Kp = 100, Kd = 20) has a 3.7 mm detour.

UR5 pose (MuJoCo, 2 ms): from the home pose, move 17 cm *and* rotate 0.54 rad. OSC with
Kp = 100, Kd = 20 ends 1×10⁻⁶ m and 4×10⁻⁶ rad away after 1.5 s, deviating 1.3 mm from
the straight line. **What failed first:** Jᵀ on the UR5. Its last joint has only
1.7×10⁻⁴ kg m² about its axis (our approximate UR5 inertias, `robots.py`), so a rotational
damping of 0.5 N m s/rad already made Kd·dt/J ≈ 3 and the simulation exploded in 10 ms. With
gains small enough for the wrist, the heavy shoulder took > 2 s and still wobbled (6 mm,
0.03 rad). OSC's Λ scales each direction by the inertia it actually moves, which is the same
lesson as lab 22, now in task space.

## Task

Implement `planar2r_fk`, `planar2r_jacobian`, `orientation_error`, `pose_error`,
`jacobian_transpose_control`, `task_space_inertia`, `operational_space_control`,
`nullspace_projector`.

    python -m labs.manipulators check lab24
    python -m labs.manipulators visual lab24   # J^T vs OSC paths of the 2R tip
