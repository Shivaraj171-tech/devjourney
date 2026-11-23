# Lab 21 · Independent joint PD control

Module 7 (control) · 150 XP · browser twin: Module 7 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Until now the simulator moved the arm for us: lab 11's servos tracked whatever
we asked. From this lab on, **we** choose the joint torques, through MuJoCo
`<motor>` actuators (pure torque sources, no servo inside). The oldest, most
common answer is to treat every joint on its own as a mass on a spring with a
shock absorber:

    τ = Kp (q_des − q) + Kd (q̇_des − q̇)
        "spring"          "damper"

The spring pulls the joint towards the target, the damper bleeds off speed. A
stiff spring is fast but bouncy; a big damper is calm but slow. You'll **measure**
that trade-off, then see PD's blind spot: gravity. A spring only pushes back when
it's stretched, so an arm held by PD alone sags until the spring is stretched
enough to carry its weight. That sag is the steady-state error, and you'll
predict it exactly with the g(q) you derived in lab 18.

## Key maths, step by step

**1. The control law.** For each joint, `pd_torque` returns
τ = Kp (q_des − q) + Kd (q̇_des − q̇) (scalars or per-joint gains; q̇_des = 0 for a
set-point).

**2. One joint is a mass–spring–damper.** A single link with inertia J about
its joint, no gravity, obeys J q̈ = τ. With e = q − q_des (constant q_des) the closed
loop is

    J ë + Kd ė + Kp e = 0     ⇔     ë + 2ζωₙ ė + ωₙ² e = 0

Matching the two forms: ωₙ² = Kp / J and 2ζωₙ = Kd / J, so to *design* the response

    Kp = J ωₙ²,       Kd = 2 ζ ωₙ J          (pd_gains)

ωₙ sets the speed, ζ the character: ζ < 1 underdamped (overshoots), ζ = 1
critically damped (fastest without overshoot), ζ > 1 overdamped.

**3. What a step does.** For ζ < 1 the solution from e(0) = −1 (a unit step) is

    r(t) = 1 − e^{−ζωₙt} [cos ω_d t + ζ/√(1−ζ²) sin ω_d t],     ω_d = ωₙ √(1−ζ²)

Its first peak is where ṙ = 0, at t_p = π/ω_d. Plug in: cos π = −1, sin π = 0, so
r(t_p) = 1 + e^{−ζωₙπ/ω_d}, i.e. the **overshoot**

    M_p = exp(−ζπ / √(1 − ζ²))                    (0 for ζ ≥ 1)

ζ = 0.5 gives 16.3%, ζ = 0.7 gives 4.6%. The oscillation lives inside the envelope
e^{−ζωₙt}, which reaches 2% at t = ln 50 / (ζωₙ) ≈ 3.9 / (ζωₙ): the classic
**settling-time estimate** (often rounded to 4 / (ζωₙ)). It's an estimate: the
actual signal can enter the band a little earlier or later than its envelope.

**4. Measure a response.** `step_metrics` normalises r = (y − y_start)/(y_target − y_start)
(so downward steps work too) and reports the overshoot max(r) − 1 (≥ 0), the 10–90%
rise time, the 2% settling time (the first time after which |r − 1| stays ≤ 0.02)
and the steady-state error y_target − y(end).

**5. Gravity: the steady-state error.** Put PD on the 2R arm of lab 18, which
feels gravity. At rest (q̇ = q̈ = 0) the dynamics M q̈ + C q̇ + g(q) = τ collapse to

    Kp (q_des − q_ss) = g(q_ss)

The spring must be stretched by Kp⁻¹ g to hold the weight. q_ss appears on both
sides, so solve by fixed-point iteration q ← q_des − Kp⁻¹ g(q) starting at q_des. For
large Kp this map barely moves q (a contraction), and the first iterate already
shows the scaling: **error ≈ Kp⁻¹ g(q_des)**, so doubling Kp halves the droop but
never removes it. (Infinite gains aren't available. Real motors saturate, and high
gains amplify sensor noise and excite flexible modes.)

**6. The MuJoCo loop.** `toolbox.models.with_motors(xml, n)` adds
`<motor joint="ji" gear="1"/>` actuators: MuJoCo then adds `gear · ctrl` to joint i's
generalized force, with no internal dynamics. `run_mujoco_control` is the loop
every lab in this module uses: read `qpos`, `qvel` → τ = controller(t, q, q̇) →
`data.ctrl[:n] = τ` → optional `before_step(model, data, t)` hook (for pushes and
logging in lab 25) → `mj_step`. The torque is held for one timestep (a 1 kHz
digital controller). The same `controller(t, q, qd)` also drives lab 20's numpy
`simulate`, which is how the tests compare them.

## What we measured

Single link (J = 1/3 kg m², ωₙ = 10 rad/s, unit step, RK4 at 1 ms), numpy and
MuJoCo identical to 10⁻⁶ rad:

| ζ | overshoot (formula) | overshoot (measured) | settling (estimate) | settling (measured) |
|---|---|---|---|---|
| 0.2 | 52.7% | 53.1% | 1.96 s | 1.97 s |
| 0.5 | 16.3% | 16.4% | 0.78 s | 0.81 s |
| 0.7 | 4.6% | 4.6% | 0.56 s | 0.60 s |
| 1.0 | 0 | 0 | — | 0.58 s |

The small extra overshoot comes from holding τ constant for each 1 ms step (a
tiny delay). 2R arm under gravity, target q = (0.5, 0.3), Kd = 2√Kp:

| Kp | joint-1 error | joint-2 error |
|---|---|---|
| 50 | 0.307 rad (17.6°) | 0.057 rad |
| 100 | 0.145 rad | 0.025 rad |
| 200 | 0.070 rad | 0.012 rad |
| 400 | 0.034 rad | 0.006 rad |

The fixed-point prediction matches the numpy simulator and MuJoCo to ~10⁻⁸ rad.
Lab 22 removes the error without raising the gains.

## Task

Implement `pd_torque`, `pd_gains`, `overshoot_from_zeta`, `settling_time_estimate`,
`step_metrics`, `gravity_droop`, `run_mujoco_control`.

    python -m labs.manipulators check lab21
    python -m labs.manipulators visual lab21   # step responses vs zeta, droop vs Kp
