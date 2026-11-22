# Lab 03 · Axis-angle, Rodrigues, exp and log

Module 1 · 120 XP · browser twin: Module 1 of the web track

## Intuition

Euler's rotation theorem: *any* orientation change is a single turn by angle θ
about one fixed unit axis k̂. Bundle them into one **rotation vector**
ω = k̂ θ (direction = axis, length = angle). That is a 3-number description with
no gimbal lock at the identity, and it is the same object as an angular velocity
held for one second. Physically: spin at constant angular velocity ω for one
unit of time and you arrive at R = exp([ω]).

This lab is the hinge of the whole course: the same exponential (in its 4x4
form) gives forward kinematics in Module 2, and its derivative gives the
Jacobian in Module 3.

## Key maths, step by step

**1. The ODE.** A vector p spinning about unit axis k̂ at rate 1 obeys
ṗ = k̂ × p = [k̂] p. Linear ODE, so p(θ) = exp([k̂] θ) p(0). Hence
R = exp([k̂] θ) = I + [k̂]θ + [k̂]²θ²/2! + [k̂]³θ³/3! + …

**2. The cube trick.** For a unit k̂, `[k̂]³ = −[k̂]`. (Check: [k̂]²v = k̂×(k̂×v) =
k̂(k̂·v) − v, which is minus the part of v perpendicular to k̂; one more cross with k̂
gives −k̂×v.) So the powers cycle: [k̂], [k̂]², −[k̂], −[k̂]², …

**3. Collect terms.**

    exp([k̂]θ) = I + (θ − θ³/3! + θ⁵/5! − …)[k̂] + (θ²/2! − θ⁴/4! + …)[k̂]²
              = I + sin θ [k̂] + (1 − cos θ) [k̂]²              (Rodrigues' formula)

**4. Getting θ back.** Take the trace: tr I = 3, tr [k̂] = 0, tr [k̂]² = −2
(sum of −(1 − k_i²)). So tr R = 1 + 2 cos θ, i.e.

    θ = arccos((tr R − 1) / 2)          (clip to [−1, 1] first: round-off!)

**5. Getting k̂ back.** [k̂]² is symmetric and [k̂] is skew, so the skew part of R is

    R − Rᵀ = 2 sin θ [k̂]     =>     ω = k̂θ = θ / (2 sin θ) · vee(R − Rᵀ)

Three regimes, because of that division:
- θ ≈ 0: R ≈ I + [ω], so ω ≈ vee(R − Rᵀ)/2. (θ/sin θ → 1.)
- generic: the formula above.
- θ ≈ π: sin θ ≈ 0 and R − Rᵀ ≈ 0, so the skew part carries no information.
  Use the symmetric part instead: at θ = π, R = I + 2[k̂]², and [k̂]² = k̂k̂ᵀ − I, so
  **(R + I)/2 = k̂k̂ᵀ**. Any non-zero column of k̂k̂ᵀ is a multiple of k̂; take the one
  with the largest diagonal entry for accuracy. (+k̂ and −k̂ are both correct at π.)

## Task

Implement `rodrigues`, `exp_so3`, `log_so3`, `axis_angle_from_matrix`.

    python -m labs.manipulators check lab03

Real-robot note: MuJoCo stores orientation as a quaternion (lab 04), but
`mujoco.mju_quat2Vel` converts a quaternion into exactly this rotation vector.
