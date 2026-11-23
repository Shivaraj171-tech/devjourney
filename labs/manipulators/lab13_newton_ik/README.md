# Lab 13 · Numerical IK: Newton–Raphson on the body twist error

Module 4 (inverse kinematics) · 180 XP · browser twin: Module 4 of the web track (planned)

## Intuition

Closed forms (lab 12) need special geometry and a page of trigonometry per
robot. A numerical method works for *any* arm you can write FK and a Jacobian
for, which you can (labs 07 and 09). The idea is the one behind resolved-rate
control (lab 11), run in "fast forward":

> Measure how far the hand is from the target, as a twist. Ask the Jacobian
> which small joint change would produce that twist. Apply it. Repeat.

Near a solution the error **squares** each step: 10⁻² → 10⁻⁴ → 10⁻⁸. That's
Newton's method, and it's why a few iterations from a good guess are enough.
Far from a solution, or near a singularity, it can wander, jump to another
solution, or not converge at all. Seeing all of that is the point of this lab.

## Key maths, step by step

**1. The error as a twist.** We want T_sb(q) = T_sd. The transform from the
current end-effector frame {b} to the desired {d} is T_bd = T_sb⁻¹ T_sd. Its
matrix log (lab 07) is the twist that, followed for unit time, carries {b} onto
{d}:

    V_b = log(T_sb(q)⁻¹ T_sd)   ∈ R⁶,  (ω, v) in the CURRENT end-effector frame

It's zero exactly when the pose is right. Unlike "position error + some angle
error" it treats rotation and translation together, and it lives in the same
frame as the body Jacobian. That pairing is no accident.

**2. Linearise.** For a small joint change Δq, the body twist produced is
J_b(q) Δq (lab 09). To first order, moving by Δq changes the error by
−J_b Δq. Setting the new error to zero:

    J_b(q) Δq = V_b

**3. Solve it, even when J_b isn't square or invertible.** For the 6-DOF UR5,
J_b is 6×6 and usually invertible. In general take the least-squares,
minimum-norm solution Δq = J_b⁺ V_b (the pseudo-inverse). Use
`np.linalg.lstsq(J, V, rcond=None)[0]`: it's the same thing, but it doesn't
form J⁺, and at an exact singularity it quietly drops the lost direction
instead of dividing by zero.

**4. Iterate (Lynch & Park, *Modern Robotics*, sec. 6.2.2).**

    q = q0
    loop:
        V_b = log(T_sb(q)⁻¹ T_sd)
        stop if |ω_b| < ε_ω and |v_b| < ε_v      (two tolerances: rad and m)
        q = q + J_b(q)⁺ V_b

Keep a history of (|ω|, |v|) per iterate: it's your convergence plot.

**5. Why quadratic?** Write the residual as f(q) with f(q*) = 0 and f′ = J
invertible at q*. A Taylor expansion of f around the iterate,
f(q*) = f(q_k) + J (q* − q_k) + O(|q* − q_k|²), with the Newton update
q_{k+1} = q_k − J⁻¹ f(q_k), gives |q_{k+1} − q*| ≤ C |q_k − q*|². Estimate the
order from three consecutive errors:

    p_k = log(e_{k+1}/e_k) / log(e_k/e_{k−1})     → 2 for Newton, 1 for gradient descent

(Our twist log isn't exactly the f whose derivative is J_b, but the two agree
to first order at the solution, which is all the argument needs.)

**6. Failure cases you'll see in the tests.**
- **Unreachable target**: no q makes V_b = 0. The iteration never meets the
  tolerance, the error stalls or oscillates, and the joints can wind up
  (we measured |q| > 100 rad on the UR5). Always cap the iterations and
  report `success=False`.
- **Seed decides the solution**: the UR5 has up to 8 IK solutions. Starting
  near q = 0 (a singular configuration: sin q₃ = sin q₅ = 0, lab 10) converges,
  but to a *different* solution than the one that generated the target.
  Newton finds *a* solution, not *the* one you wanted.
- **Far seeds**: the linearisation is poor, so steps are large and erratic.
  Newton may still converge after many iterations, with joints many turns away
  from (−π, π]. Wrap afterwards (lab 12) or use lab 14's damping.

**7. Position-only IK on the 3-DOF arm.** Same loop with e = p_d − p(q) and the
3×n linear Jacobian J_v (top rows of the geometric Jacobian). Seeded near an
elbow-up configuration it converges to lab 12's elbow-up answer, and seeded
near elbow-down to the elbow-down one.

## Task

Implement `body_twist_error`, `error_norms`, `newton_step`, `ik_newton`,
`ik_newton_position`, `convergence_order`.

    python -m labs.manipulators check lab13
    python -m labs.manipulators visual lab13   # error vs iteration for several seeds
