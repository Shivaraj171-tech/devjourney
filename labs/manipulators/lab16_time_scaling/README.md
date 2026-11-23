# Lab 16 · Time scaling: cubic, quintic and trapezoidal profiles

Module 5 (trajectories) · 150 XP · browser twin: Module 5 of the web track (planned)

## Intuition

A **path** says *where* to go: a curve q(s) or T(s) with s running from 0 to 1.
A **time scaling** s(t) says *when*: how fast to run along that path. Separating
the two is the standard trick of trajectory planning (Lynch & Park, ch. 9).
The geometry is designed once, and the timing is chosen to respect the motors.

Real motors have limits: a top speed and a maximum acceleration (a torque limit,
roughly). Real payloads (coffee cups, wafers) dislike jerk, the rate of change of
acceleration. The three classic time scalings trade these off:

- **cubic**: smooth position and velocity, but acceleration *jumps* at start and
  stop (infinite jerk, felt as a "clunk"),
- **quintic**: also starts and stops with zero acceleration (lab 11 used it),
- **trapezoidal**: accelerate at the maximum, cruise at top speed, decelerate.
  It's the *fastest* move within vel/acc limits, and what most industrial
  controllers do by default.

## Key maths, step by step

**1. A cubic through two states.** x(t) = a₀ + a₁t + a₂t² + a₃t³ with x(0) = x₀,
ẋ(0) = v₀, x(T) = x₁, ẋ(T) = v₁. The first two give a₀ = x₀, a₁ = v₀. With
D = x₁ − x₀ the other two are

    a₂T² + a₃T³  = D − v₀T
    2a₂T + 3a₃T² = v₁ − v₀

Solve this 2×2 system (multiply the first by 3, the second by T, subtract):

    a₂ = (3D − (2v₀ + v₁)T) / T²,     a₃ = (−2D + (v₀ + v₁)T) / T³

For rest-to-rest with x₀ = 0, x₁ = 1 and τ = t/T this is **s = 3τ² − 2τ³**.

**2. A quintic: add acceleration conditions.** Six conditions (x, ẋ, ẍ at both
ends) for six coefficients. Write each condition as a row of a 6×6 linear system
in [c₀ … c₅] and solve it with `np.linalg.solve`. Rest-to-rest gives
**s = 10τ³ − 15τ⁴ + 6τ⁵**, the lab 11 formula, now derived.

**3. Peaks, and the minimum feasible duration.** Differentiate with τ = t/T
(each d/dt brings a 1/T):

    cubic:   ṡ = (6τ − 6τ²)/T            max 1.5/T at τ = ½
             s̈ = (6 − 12τ)/T²            max 6/T² at τ = 0 and 1 (and it jumps from 0!)
    quintic: ṡ = (30τ² − 60τ³ + 30τ⁴)/T   max 15/(8T) at τ = ½
             s̈ = (60τ − 180τ² + 120τ³)/T² max (10√3/3)/T² ≈ 5.77/T² at τ = (3 − √3)/6

(the last one from setting the jerk 60 − 360τ + 360τ² to zero). For a move of
distance D, the peaks are D times these. Requiring both peaks to stay within the limits:

    T_min = max( c_v D / v_max ,  √(c_a D / a_max) )

**4. The trapezoid.** Accelerate at a_max for t_a = v_max / a_max (covering
v_max²/(2a_max)), cruise at v_max, then decelerate symmetrically. Distance
balance: D = v_max (T − t_a), so

    T = D / v_max + v_max / a_max

This needs room to reach v_max: D ≥ v_max²/a_max. Otherwise the profile is a
**triangle**: accelerate to v_peak = √(D a_max) and immediately decelerate,
T = 2√(D/a_max). It's the minimum-time profile under both limits: you can't
accelerate harder, and you can't go faster. The price is jumps in acceleration
(infinite jerk) at its four corners. "S-curve" profiles add a jerk limit (stretch).

**5. Sampling it.** The phases, for 0 ≤ t ≤ T with a = v_peak / t_a:

    t < t_a:          x = ½ a t²,                 ẋ = a t,        ẍ = a
    t_a ≤ t ≤ T − t_a: x = ½ a t_a² + v (t − t_a),  ẋ = v,          ẍ = 0
    t > T − t_a:      x = D − ½ a (T − t)²,        ẋ = a (T − t),  ẍ = −a

For negative D, run it for |D| and flip the sign.

## Task

Implement `cubic_coefficients`, `quintic_coefficients`, `cubic_scaling`,
`quintic_scaling`, `min_time_polynomial`, `trapezoid_profile`, `trapezoid_sample`,
and fill in the peak constants `CUBIC_PEAKS`, `QUINTIC_PEAKS`.

    python -m labs.manipulators check lab16
    python -m labs.manipulators visual lab16   # s, v, a of the three profiles, same limits
