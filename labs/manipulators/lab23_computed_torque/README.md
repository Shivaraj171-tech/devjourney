# Lab 23 · Computed-torque control

Module 7 (control) · 220 XP · browser twin: Module 7 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

PD + gravity (lab 22) holds a pose perfectly but **lags** along a moving
trajectory: the springs have to be stretched before they push, so the arm is
always a little behind, and the coupling between joints (lab 18's M and C) shows
up as error. Yet we have the whole dynamic model. Lab 19 can tell us exactly which torque
produces the acceleration we want. So use it: ask the model for the torque that
gives the *desired* acceleration, plus a correction that pulls the error back
to zero:

    τ = M(q) [ q̈_d + Kd (q̇_d − q̇) + Kp (q_d − q) ] + C(q, q̇) q̇ + g(q)

This is **computed-torque** or **inverse-dynamics** control (also called
feedback linearisation). With a perfect model it turns a nonlinear, coupled arm
into n independent, identical, *linear* double integrators. Every joint's error then
obeys the same textbook second-order equation, whatever the arm is doing.
The catch: the model is never perfect. We'll make it 20% wrong and measure what
that costs.

## Key maths, step by step

**1. Cancel, then control.** Write the law as τ = M(q) v + b(q, q̇) with
b = C q̇ + g and a new input v. Put it into the dynamics M q̈ + b = τ:

    M(q) q̈ + b = M(q) v + b    ⇒    q̈ = v

The arm is now n decoupled double integrators. M is invertible (positive definite),
so nothing is lost by the cancellation. Choose v = q̈_d + Kd ė + Kp e with
e = q_d − q.

**2. The error dynamics.** q̈ = v gives

    ë + Kd ė + Kp e = 0

a linear ODE, the same for every joint and every pose. Note the units: Kp, Kd act on
*accelerations* (1/s², 1/s), and M(q) converts them into torque, so effectively the
gains are scaled by the inertia the joint currently sees (lab 22's lesson,
done automatically). With ωₙ chosen, ζ = 1 (`critically_damped_gains`): Kp = ωₙ², Kd = 2ωₙ.
The solution of ë + 2ωₙ ė + ωₙ² e = 0 (a double root −ωₙ) is

    e(t) = (e₀ + (ė₀ + ωₙ e₀) t) e^{−ωₙ t}          (error_response)

and the test checks that the simulated 2R arm follows it.

**3. A reference to track.** Lab 16's quintic s(t), on a joint-space line:
q_d = q₀ + s (q₁ − q₀), q̇_d = ṡ (q₁ − q₀), q̈_d = s̈ (q₁ − q₀). It's smooth to the
acceleration, so the feedforward q̈_d is finite and continuous.

**4. Baseline: PD + gravity along the same trajectory.** τ = Kp e + Kd ė + g(q)
with the *same numbers* for Kp, Kd. It has no idea that accelerating the arm takes
torque, so it only produces that torque once the error has grown. It's the lag you see in
the visual.

**5. A wrong model.** Suppose every mass and inertia in the controller is
(1 + δ) times the truth. M, C and g are **linear in the masses** (look at lab
18's formulas), so the model is M̂ = (1 + δ) M, b̂ = (1 + δ) b. Then

    M q̈ + b = (1 + δ)(M v + b)   ⇒   q̈ = (1 + δ) v + δ M⁻¹ b

Subtract from q̈_d:

    ë + (1 + δ)(Kd ė + Kp e) = −δ (q̈_d + M⁻¹ b)

The cancellation leaves a **disturbance** of size δ times (desired acceleration +
gravity's acceleration), filtered by a stable second-order system whose
DC gain is 1/((1 + δ) Kp). So:

- the error scales like δ / ωₙ²: doubling ωₙ cuts it by ~4, and
- at rest (q̈_d = 0, b = g) it settles at **e = −δ/((1 + δ) Kp) · M⁻¹ g**
  (`scaled_model_offset`). The test checks this against the simulation to 10⁻⁶ rad.

The error stays *bounded*, and the closed loop is still stable for these errors
(1 + δ > 0 keeps the gains positive). Robust and adaptive control make this precise.

## What we measured

2R arm, (−1.2, 0.3) → (0.8, −0.6) in 1.5 s, RK4 at 1 ms, max ‖q − q_d‖ over 2 s:

| controller (ωₙ = 10 ⇒ Kp = 100, Kd = 20) | max error |
|---|---|
| computed torque, exact model | 3.1×10⁻⁴ rad (the 1 ms torque hold; final error 3×10⁻⁶) |
| computed torque, masses +20% | 0.041 rad |
| computed torque, masses −20% | 0.061 rad |
| PD + g(q), same numbers as gains | 0.086 rad |
| computed torque, masses +20%, ωₙ = 20 | 0.011 rad (3.6× smaller) |

MuJoCo (motors, RK4) reproduces the numpy runs to 10⁻⁶ rad. On the 3-DOF arm in
MuJoCo (2 ms steps, RNEA model from lab 19, (0, 0.3, −0.5) → (1, 1, −1.5)), the exact
model gives 4.3×10⁻⁴ rad, masses +20% give 0.057 rad and −20% give 0.104 rad. A fair
comparison: PD + g with gains scaled by the diagonal of M(q₁) (lab 22's trick, ωₙ = 10)
gives 0.055 rad there. So computed torque is not magic. Its big win comes when the
model is good, and that's why the dynamics labs (18–20) insisted on matching MuJoCo.

## Task

Implement `critically_damped_gains`, `quintic_reference`, `computed_torque`,
`pd_gravity_tracking`, `error_response`, `scaled_model_offset`, `scale_masses`,
`scale_links`, `tracking_error`.

    python -m labs.manipulators check lab23
    python -m labs.manipulators visual lab23   # tracking errors: CT exact / CT +-20% / PD + g
