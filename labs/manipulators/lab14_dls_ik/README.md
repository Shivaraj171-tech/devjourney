# Lab 14 · Damped least squares, joint limits, and choosing a solution

Module 4 (inverse kinematics) · 200 XP · browser twin: Module 4 of the web track (planned)

## Intuition

Lab 13's Newton step trusts the linearisation completely. Near a singularity
that trust is badly misplaced: J has a tiny singular value σ, so J⁺ contains
1/σ and the step is huge. On the UR5e with sin q₅ ≈ 10⁻⁴ we measured a **316 rad**
Newton step for a 2.8 cm error. The next linearisation is then
taken somewhere absurd.

**Damped least squares** (DLS) asks for a step that reduces the error *and*
stays small. **Levenberg–Marquardt** (LM) tunes the damping on the fly: it
damps hard when steps don't help, and barely at all when they do, so near
the answer it's back to fast Newton convergence. Add **joint limits** (real
arms have cables and hard stops) and a rule for **which of the 8 UR5e solutions
to use**, and you have what a practical IK solver is made of.

## Key maths, step by step

**1. The damped problem.** Instead of solving J Δq = e exactly, minimise

    f(Δq) = |J Δq − e|² + λ² |Δq|²

Gradient = 0: 2Jᵀ(J Δq − e) + 2λ² Δq = 0 ⇒ (JᵀJ + λ²I) Δq = Jᵀ e. Use the
identity (JᵀJ + λ²I)⁻¹Jᵀ = Jᵀ(JJᵀ + λ²I)⁻¹ (multiply both sides on the left by
(JᵀJ + λ²I) and on the right by (JJᵀ + λ²I) to check it). This gives the
m×m form:

    Δq = Jᵀ (J Jᵀ + λ² I)⁻¹ e

This is the same formula as lab 11, now inside an IK loop.

**2. What damping does, per singular direction.** With J = U Σ Vᵀ:

    Δq = Σᵢ  σᵢ / (σᵢ² + λ²) · (uᵢᵀ e) vᵢ

For σᵢ ≫ λ this is ≈ 1/σᵢ (Newton). For σᵢ ≪ λ it's ≈ σᵢ/λ² → 0, so a lost
direction is simply not pursued. The largest possible gain is 1/(2λ), at σ = λ.
The step is therefore **bounded**: |Δq| ≤ |e| / (2λ).

**3. Levenberg–Marquardt: adapt λ.** Fixed λ is a compromise: big λ means slow
convergence and a residual bias, small λ means no protection. LM uses cost
c(q) = |V_b(q)|² and:

    try q' = q + Δq(λ)
    if c(q') < c(q):  accept, λ ← λ / 10   (trust the model more: Newton-like)
    else:             reject, λ ← λ × 10   (shorter, gradient-like step)

Large λ: Δq ≈ Jᵀe/λ², a small step along the gradient of ½|e|² (−∇ = Jᵀe), which
can always reduce the cost if any step can. Small λ: the Newton step, so
convergence is quadratic again at the end. Accepted costs never increase. That
guarantee is what plain Newton lacks.

**4. Joint limits by projection.** After each trial step, wrap to (−π, π]
(lab 12) and clip each joint into [q_min, q_max]. This projects the step onto
the box of allowed joints. It's simple and it's what many real solvers do
(TRAC-IK combines this kind of projected Newton with an SQP solver).
Watch out: if a clipped joint lands on a singular value (clipping q₃ to 0
stretches the elbow!) the solver can stall on the boundary. Re-seed from inside
the limits. The tests show both cases.

**5. Many solutions: find them, then choose.** A general UR5e pose has **8**
solutions (shoulder left/right × elbow up/down × wrist flip). One run returns
one of them, decided by the seed (lab 13). Run LM from many seeds and remove
duplicates (equal after wrapping, to a tolerance). Then **choose**:

    q* = argmin over valid candidates  √(Σ wᵢ (qᵢ − q_current,ᵢ)²)

The closest solution means the least motion and no surprise flips mid-task.
Weights wᵢ > 1 on the big, slow proximal joints prefer moving the wrist instead.
Candidates outside the limits are discarded. Don't wrap the difference: with
limits a joint can't take the short way through ±π, so the plain difference
is the real travel.

**6. Unreachable targets, handled gracefully.** LM can't succeed, but since its
cost never increases it ends at a *closest-approach* configuration with
bounded joints (Newton wound up to thousands of radians in lab 13). Reporting "unreachable,
best effort is this far off" is far more useful than garbage joint angles.

## Task

Implement `dls_step`, `clamp_to_limits`, `ik_lm`, `within_limits`,
`distinct_solutions`, `multi_start_ik`, `select_solution`.

    python -m labs.manipulators check lab14

Stretch (no tests): plot the LM λ history for a far seed. You'll see it rise
while the model is poor and fall by 10× per step at the end.
