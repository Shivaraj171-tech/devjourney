# Lab 22 · PD + gravity compensation

Module 7 (control) · 180 XP · browser twin: Module 7 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Lab 21's arm sagged because its springs had to carry the arm's weight. The fix is
almost embarrassingly simple: **you know the weight**. Lab 18 (2R) and lab 19 (any
arm, via RNEA) give g(q), the torque that holds the arm still against gravity.
Add it to the motor command and the springs only have to do the moving:

    τ = Kp (q_des − q) − Kd q̇ + g(q)

Now the arm behaves as if it were floating in space, held by springs and
dampers, and it settles exactly on target with the *same* gains that left
0.31 rad of error in lab 21. Every industrial arm does this: it's the "gravity
compensation" or "float" mode you can push around by hand.

Why should a nonlinear, coupled, 6-joint system with this controller be stable
at all? The argument is an energy one, and it's short enough to follow in full.

## Key maths, step by step

**1. The control law.** `pd_gravity` = lab 21's `pd_torque` + g(q). Plug it into
M q̈ + C q̇ + g = τ: the g's cancel exactly, leaving

    M(q) q̈ + C(q, q̇) q̇ = Kp e − Kd q̇,      e = q_des − q

At rest (q̇ = q̈ = 0) the left side is zero, so Kp e = 0 ⇒ **e = 0**. The only
equilibrium is the target.

**2. g(q) for any arm.** `make_gravity_fn(dh, links)` wraps lab 19's RNEA with
q̇ = q̈ = 0. Build `rnea_model` once outside the returned closure, because it runs every
control step (1 kHz).

**3. Stability: energy that can only go down (Lyapunov).** Take as a "total
energy" the kinetic energy plus the energy stored in the virtual springs:

    V(q, q̇) = ½ q̇ᵀ M(q) q̇ + ½ eᵀ Kp e      (≥ 0, and = 0 only at rest on target)

Differentiate along the motion (ė = −q̇ for a constant target):

    V̇ = q̇ᵀ M q̈ + ½ q̇ᵀ Ṁ q̇ − eᵀ Kp q̇

Substitute M q̈ = Kp e − Kd q̇ − C q̇ from step 1:

    V̇ = q̇ᵀ Kp e − q̇ᵀ Kd q̇ − q̇ᵀ C q̇ + ½ q̇ᵀ Ṁ q̇ − eᵀ Kp q̇
      = −q̇ᵀ Kd q̇ + ½ q̇ᵀ (Ṁ − 2C) q̇

The last term is zero because **Ṁ − 2C is skew-symmetric** (lab 18, step 6:
xᵀ S x = 0 for any skew S). What's left:

    V̇ = −q̇ᵀ Kd q̇ ≤ 0

The dampers are the only thing that changes V, and they only remove energy. So V
can never grow: the arm can't run away. Could it get stuck somewhere with q̇ = 0
but e ≠ 0? Only if it could *stay* there, but at q̇ = 0 step 1 gives M q̈ = Kp e ≠ 0,
so it starts moving again. That's LaSalle's invariance principle in one sentence, and
it's why the arm always ends up on target. (We skip the formal proof; the test
checks numerically that V never increases and that V̇ = −q̇ᵀKd q̇.)

The intuition to keep: *the controller is a passive mechanical system* (springs plus
dampers), and connecting passive things together can't create energy.

**4. A cheaper variant: g(q_des).** `pd_gravity_desired` uses the constant
feedforward g(q_des), computed once, so there's no RNEA in the loop. At the target it's the
same torque, so the equilibrium is still exact. Away from it the spring must also cover
g(q) − g(q_des). That works as long as Kp is stiffer than the gravity "spring"
∂g/∂q (Kp > max ‖∂g/∂q‖ is the usual sufficient condition). With Kp = 50 the 2R arm
converges to 10⁻⁸ rad, the same as the full version.

**5. A wrong model.** Compensation is only as good as the masses you believe in.
If the controller uses g_model ≠ g_true, the rest condition becomes

    Kp (q_des − q) = g_true(q) − g_model(q)

which is lab 21's droop, driven by the model error instead of the full weight. Solve
it by the same fixed-point iteration (`model_error_offset`). With masses 20% too
**heavy**, the arm is lifted *past* the target: 0.052 rad on joint 1 at Kp = 50
(compared with 0.31 rad of sag with no compensation at all). An integral term (PID) would remove
the residual, at the price of windup and slower, less damped transients.

## What we measured

| 2R arm, target (0.5, 0.3), Kp = 50, Kd = 2√50 | final error |
|---|---|
| PD alone (lab 21) | 0.307 rad, 0.057 rad |
| PD + g(q) (numpy RK4 and MuJoCo) | < 10⁻⁸ rad |
| PD + g(q_des) | 1.2×10⁻⁸ rad |
| PD + g(q) with masses 20% too heavy | −0.052 rad, −0.008 rad (prediction agrees to 10⁻⁹) |

The 3-DOF arm in MuJoCo, target (0.5, 0.6, −0.8), per-joint gains Kp = Jᵢ·100,
Kd = Jᵢ·20 (Jᵢ = Mᵢᵢ(q_des), i.e. ωₙ = 10 rad/s, ζ = 1 per joint): PD alone ends 0.21 and
0.35 rad off, while PD + RNEA gravity ends within 4×10⁻⁵ rad after 2 s. **Scale gains with
inertia:** our first try used Kd = 20 on every joint, and the wrist-like third joint
(J = 0.037 kg m²) went unstable. In discrete time, Kd·dt/J must stay well below 1
(here it was 1.08).

## Task

Implement `pd_gravity`, `pd_gravity_desired`, `make_gravity_fn`, `lyapunov`,
`lyapunov_rate`, `model_error_offset`.

    python -m labs.manipulators check lab22
    python -m labs.manipulators visual lab22   # V(t) and the error, with and without g(q)
