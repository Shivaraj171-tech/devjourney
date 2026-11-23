# Lab 10 · Singularities and manipulability

Module 3 · 150 XP · browser twin: Module 3 of the web track

## Intuition

Stretch your arm straight out and try to move your hand further away: you
can't, however fast your shoulder and elbow turn. That pose is a
**singularity**: the Jacobian has lost rank, so some gripper direction is
unreachable *instantaneously*. Near it, the inverse is huge: tiny motions in
the "weak" direction need enormous joint speeds, which is why a robot controller
that simply inverts J will whip its joints around and fault out.

You saw the same thing in lab 02 (gimbal lock = the Euler-rate map losing rank).
Singularities are a property of the *mechanism*, though, so you can't
reparametrise them away; you can only detect, avoid or handle them (lab 11).

## Key maths, step by step

**1. SVD of the Jacobian.** J = U Σ Vᵀ with σ₁ ≥ σ₂ ≥ … ≥ 0. Reading it as a
pipeline: Vᵀ rotates joint space, Σ stretches axis i by σᵢ, U rotates into task
space. So a joint-speed vector along vᵢ produces gripper velocity σᵢ uᵢ.

**2. Rank and singularity.** rank J = number of σᵢ > 0. In floating point, count
σᵢ > tol. Singular ⇔ rank < min(m, n). The *lost* task directions are the uᵢ with
σᵢ ≈ 0; the joint motions that do nothing (self-motion) are the matching vᵢ.

**3. The manipulability ellipsoid.** Push the unit ball ‖q̇‖ ≤ 1 through J. With
v = J q̇ = U Σ Vᵀ q̇, write z = Vᵀ q̇ (still ‖z‖ ≤ 1) and the image is
{U Σ z}: an ellipsoid with **semi-axes σᵢ along uᵢ**. Long axis = fast, easy
direction; a flat ellipsoid = near singular.

**4. Scalar measures.**
- Yoshikawa manipulability w = √det(J Jᵀ) = σ₁σ₂⋯σ_m (∝ ellipsoid volume). Use
  the product of σ's: det(J Jᵀ) can round to a small *negative* number.
- Condition number κ = σ_max / σ_min (shape, not size; ∞ at a singularity).
  It's unitless only if J's rows have the same units: mix of metres and radians
  makes κ depend on your length unit. Use the 3-row linear part Jv for a clean picture.

**5. Duality with forces.** Static force balance τ = Jᵀ F (power: τᵀq̇ = Fᵀv). The
set of forces with ‖τ‖ ≤ 1 is an ellipsoid with the *same axes* and lengths
1/σᵢ. Directions where the arm is fast are where it is weak, and vice versa: at a
stretched-out singularity the arm can hold an enormous radial load.

**6. Planar 2R, by hand.** p = (l₁c₁ + l₂c₁₂, l₁s₁ + l₂s₁₂), so

    J = [[−l₁s₁ − l₂s₁₂, −l₂s₁₂],
         [ l₁c₁ + l₂c₁₂,  l₂c₁₂]],      det J = l₁ l₂ sin θ₂

Singular iff θ₂ = 0 or π (stretched or folded). w = l₁l₂|sin θ₂| is maximal at
θ₂ = ±90° — the classic argument for elbow-at-right-angle "ready" poses.

**7. The UR5e's three singularities.** For the 6x6 geometric Jacobian (checked
numerically against numpy in this lab's tests):

    det J = a₂ a₃ sin q₃ sin q₅ (a₂ cos q₂ + a₃ cos(q₂+q₃) + d₅ sin(q₂+q₃+q₄))

- **elbow** sin q₃ = 0: upper arm and forearm aligned (stretched/folded).
- **wrist** sin q₅ = 0: joints 4 and 6 axes become parallel (a gimbal lock inside the robot!).
- **shoulder** bracket = 0: the wrist sits on the base axis, so joint 1 can't
  move it sideways.

## Task

Implement `singular_values`, `numerical_rank`, `is_singular`,
`condition_number`, `manipulability`, `velocity_ellipsoid`, `force_ellipsoid`,
`lost_directions`, `ur5e_jacobian_det`, `classify_ur5e_singularity`.

    python -m labs.manipulators check lab10
    python -m labs.manipulators visual lab10    # 2R arm with its velocity ellipses
