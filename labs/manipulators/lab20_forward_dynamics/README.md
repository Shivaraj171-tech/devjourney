# Lab 20 · Forward dynamics: write your own simulator

Module 6 (dynamics) · 250 XP (boss lab) · browser twin: Module 6 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Inverse dynamics (labs 18–19) answers *which torques produce this motion?*
**Forward dynamics** asks the simulator's question: *given these torques,
what happens?* Solve the equations of motion for the acceleration, then
integrate twice in time. That's all a physics engine does for an arm in free
space. MuJoCo, Drake, PyBullet and Isaac each add contacts, constraints and a lot of
engineering on top, but the core is the loop you write here.

The interesting part is the integrator. With small steps every method looks fine.
Watch the **energy** of an unpowered, undamped arm, which physics says must be
constant, and they separate. Explicit Euler pumps energy in until the arm
swings wildly. Semi-implicit Euler stays bounded in regular motion. RK4 is
accurate to 10⁻⁷ J. Then you'll reproduce MuJoCo's trajectories to round-off,
because MuJoCo's `RK4` and `Euler` integrators are (for this model) exactly the
methods you wrote.

## Key maths, step by step

**1. Solve for the acceleration.** From M(q) q̈ + C(q,q̇)q̇ + g(q) = τ:

    q̈ = f(q, q̇, τ) = M(q)⁻¹ (τ − C(q,q̇)q̇ − g(q))

M is symmetric positive definite (lab 18), so `np.linalg.solve` always works.
Never form M⁻¹. Lab 18's closed forms give M and C q̇ + g for the 2R arm, and lab
19's RNEA gives them for any arm: M column by column, bias = RNEA with q̈ = 0.
(Featherstone's articulated-body algorithm does it all in O(n) without forming M.)

**2. A first-order system.** Stack x = (q, q̇). Then ẋ = (q̇, f(q, q̇, τ)). Every
integrator below is a recipe for stepping x forward by dt.

**3. Three integrators.**

    explicit Euler:       q⁺ = q + dt q̇,       q̇⁺ = q̇ + dt f(q, q̇)
    semi-implicit Euler:  q̇⁺ = q̇ + dt f(q, q̇),  q⁺ = q + dt q̇⁺      (uses the NEW velocity)
    RK4:                  k₁ = F(x), k₂ = F(x + dt/2 k₁), k₃ = F(x + dt/2 k₂), k₄ = F(x + dt k₃)
                          x⁺ = x + dt/6 (k₁ + 2k₂ + 2k₃ + k₄)

τ is held constant during a step (a zero-order hold, as a digital controller
does and as MuJoCo does with `qfrc_applied`).

**4. Order of accuracy.** The global error after a fixed time T scales like dtᵖ:
p = 1 for both Euler methods and p = 4 for RK4. Measure p as the slope of
log(error) vs log(dt) against a fine-step reference. Our measurement on the 2R arm
(T = 0.5 s, dt = 20, 10, 5 ms): p = 0.96 for explicit Euler and 4.00 for RK4.

**5. Energy, the physics check.** With τ = 0 and no damping,
E = ½ q̇ᵀMq̇ + P(q) is constant: dE/dt = q̇ᵀτ = 0 (lab 18's power balance). Our 2R
arm from q = (−1.2, 0.3), at rest, dt = 5 ms, 20 s (numbers from our runs):

| integrator | max \|E − E₀\| |
|---|---|
| explicit Euler | 4.4 J and still growing (it gains energy every swing) |
| semi-implicit Euler | 0.036 J, bounded |
| RK4 | ~10⁻⁷ J |

Why the difference? For a simple pendulum, explicit Euler multiplies the
oscillation's amplitude by √(1 + ω²dt²) > 1 every step, so it always spirals
outwards. Semi-implicit Euler is **symplectic** for Hamiltonians H = ½pᵀM⁻¹p + P(q)
with *constant* M: it exactly conserves a slightly perturbed energy, so the
error stays bounded. With a configuration-dependent M(q) the guarantee is lost,
and from a high-energy start (q = (0.4, 0.8)), where the double pendulum is
chaotic, we saw both Euler methods drift by ~10 J. RK4 isn't symplectic either:
its drift is tiny but systematic.

**6. Match MuJoCo.** `toolbox/models.py` writes the same arm with
`integrator="RK4"` or `"Euler"` and the same timestep. Set `qpos`, `qvel`, put τ in
`data.qfrc_applied` before each `mj_step`. What we found (MuJoCo 4.0.1, our runs):

- MuJoCo `RK4` vs your RK4: equal to ~10⁻¹⁴ rad after 2000 steps.
- MuJoCo `Euler` vs your **semi-implicit** Euler: also ~10⁻¹⁴. MuJoCo's "Euler"
  updates the velocity first and then uses it for the position. (It also treats joint
  damping implicitly, but our model has none.) Your *explicit* Euler does **not**
  match it.
- The 3-DOF arm through *your lab 19 RNEA* (M and bias), with a gravity
  compensation plus sinusoid torque: ~10⁻¹⁴ rad after 250 RK4 steps.

If your numbers match a production engine to round-off, both implementations are
right (or they're wrong in exactly the same way, which is unlikely given how
differently they're written).

## Task

Implement `forward_dynamics`, `explicit_euler_step`, `semi_implicit_euler_step`,
`rk4_step`, `simulate`, `simulate_mujoco`, `energy_drift`, `convergence_order`.

    python -m labs.manipulators check lab20
    python -m labs.manipulators visual lab20   # energy drift of the three integrators
