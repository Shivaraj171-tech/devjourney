# Lab 11 · Resolved-rate control: a straight line in the simulator

Module 3 · 200 XP (boss lab) · MuJoCo part runs if `mujoco` is installed

## Intuition

You want the gripper to slide 27 cm in a straight line (to insert a peg, wipe a
table, follow a weld seam) while keeping its orientation. Joint-space
interpolation would curve. Instead, at every control tick ask: *what gripper
velocity do I want right now?* and convert it to joint speeds with the inverse
Jacobian: q̇ = J⁻¹ v. That's **resolved-rate** control (Whitney, 1969), and
it's still the inner loop of teleoperation, visual servoing and many "Cartesian
velocity" RL action spaces.

Two ingredients make it work on a real (or simulated) robot:
1. **Feedback**: integrating q̇ drifts; always correct with the *measured* pose error.
2. **Damping**: near a singularity J⁻¹ explodes; damped least squares trades a
   little accuracy for bounded joint speeds.

## Key maths, step by step

**1. Time scaling.** A path p(s) = p₀ + s(p₁ − p₀), s ∈ [0, 1], and a timing s(t).
Requiring zero velocity *and* acceleration at both ends (no jerk at start/stop)
gives 6 conditions → a quintic. Solving s(0)=0, s(T)=1, ṡ=s̈=0 at both ends:

    s(τ) = 10τ³ − 15τ⁴ + 6τ⁵,   τ = t/T,    ṡ = (30τ² − 60τ³ + 30τ⁴)/T

Peak speed 15/(8T) at t = T/2. Reference: p_ref = p₀ + s Δp, v_ref = ṡ Δp.

**2. Pose error.** Position: e_p = p_ref − p. Orientation: the rotation taking the
current R to R_des is R_des Rᵀ (in world axes); its rotation vector
e_ω = log(R_des Rᵀ) (lab 03) is the angular velocity that would close the gap in 1 s.
Both are world-frame, matching the geometric Jacobian [Jv; Jω] (lab 09) that
`sim.jacobian()` returns.

**3. The control law.** Feed-forward plus proportional feedback:

    v_cmd = [v_ref; 0] + K e,        q̇ = J⁺ v_cmd

With a perfect robot (J q̇ = v_cmd exactly), the error obeys ė = −K e: it decays
like e^{−Kt}. K = 20/s → time constant 50 ms. Larger K tracks tighter until the
discrete loop (dt = 10 ms) or the servos start to ring (K·dt must stay ≪ 2).

**4. Damped least squares.** Minimise ‖J q̇ − v‖² + λ²‖q̇‖² instead of inverting.
Setting the gradient to zero: (JᵀJ + λ²I) q̇ = Jᵀ v, equivalently

    q̇ = Jᵀ (J Jᵀ + λ² I)⁻¹ v

In SVD terms each 1/σᵢ becomes σᵢ/(σᵢ² + λ²): ≈ 1/σᵢ when σᵢ ≫ λ, and → 0 (not ∞)
as σᵢ → 0. λ = 0.01 is invisible away from singularities. Solve, don't invert.

**5. The loop.**

    T0 = measure; p0, R0 = T0
    for k = 0 … steps:
        t = k·dt;  (p_ref, v_ref) = line(t)
        T = measure;  log it
        e = pose_error((R0, p_ref), T)
        q̇ = dls(J_measured) · ([v_ref; 0] + K e)
        sim.step(q̇, dt)

**6. Why the MuJoCo run is harder.** In `MujocoSim` the arm has inertia, joint
damping and motor armature; each joint is held by a stiff position servo
(kp = 5000 N·m/rad, joint damping 100 N·m·s/rad, armature 0.1) that tracks
the *integrated* velocity command, with gravity compensation (`gravcomp`),
roughly like an industrial controller in velocity mode. Measured in our runs
(MuJoCo 4.0.1, 3 s hold after the move):

| gain K | max deviation during the move | error after the hold |
|---|---|---|
| 0 (feed-forward only) | 2.3 mm | 2.5 mm (servo lag is never corrected) |
| 20 (default) | 0.14 mm | ~0 |
| 60 | 0.31 mm | 0.06 mm and **ringing** (up to 0.13 mm in the last second): outer loop too fast for the servos |

An earlier, softer servo tuning (kp = 2000, damping 30) looked fine for 2.5 s
but slowly rang up after the move. That's why the MuJoCo test holds for 2 s
before judging. The numpy robot tracks to ~0.03 mm.

## Task

Implement `quintic_time_scaling`, `straight_line_reference`, `dls_inverse`,
`pose_error`, `resolved_rate_qdot`, `run_straight_line`, `path_deviation`.

    python -m labs.manipulators check lab11
    python -m labs.manipulators visual lab11   # deviation from the line, numpy vs MuJoCo

Stretch (no tests): reproduce the table above with `gain=0` and `gain=60`
(use `settle=3.0`); aim the line through the base axis and watch the shoulder singularity
(lab 10) with `damping=0` vs `0.05`.
