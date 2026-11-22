# Lab 09 · Velocity kinematics: space, body and geometric Jacobians

Module 3 (velocity kinematics) · 180 XP · browser twin: Module 3 of the web track

## Intuition

FK maps joint angles to a pose. The **Jacobian** maps joint *speeds* to the
gripper's *velocity*: V = J(q) q̇. Column i answers "if only joint i turns at
1 rad/s, how does the gripper move?" Everything in Module 3 (singularities,
manipulability, resolved-rate control) and most of what comes later (IK, force
control, operational-space control, the torque you feel at the wrist τ = Jᵀ F)
runs through this matrix.

The PoE formula makes the columns easy to see: joint i spins the rest of the arm
about its screw axis, *wherever joints 1 … i−1 have currently carried that axis*.

## Key maths, step by step

**1. Differentiate PoE.** T = e^{[S₁]q₁} ⋯ e^{[Sₙ]qₙ} M. The spatial twist is
[V_s] = Ṫ T⁻¹ (lab 07). By the product rule, the term for q̇ᵢ is

    e^{[S₁]q₁}⋯e^{[S_{i−1}]q_{i−1}} [Sᵢ] e^{[Sᵢ]qᵢ}⋯M · T⁻¹ q̇ᵢ
      = Tᵢ₋₁ [Sᵢ] Tᵢ₋₁⁻¹ q̇ᵢ,     Tᵢ₋₁ = e^{[S₁]q₁}⋯e^{[S_{i−1}]q_{i−1}}

(the factors after [Sᵢ] cancel with T⁻¹). Using [Ad_T S] = T [S] T⁻¹:

    J_s,i(q) = Ad_{Tᵢ₋₁} Sᵢ,        J_s,1 = S₁,        V_s = J_s(q) q̇

Exactly the intuition: Sᵢ moved by the joints before it.

**2. Body Jacobian.** Same steps with [V_b] = T⁻¹Ṫ and T = M e^{[B₁]q₁}⋯e^{[Bₙ]qₙ}:

    J_b,i = Ad_{e^{−[Bₙ]qₙ}⋯e^{−[B_{i+1}]q_{i+1}}} Bᵢ,     J_b,n = Bₙ
    J_b = Ad_{T⁻¹} J_s           (same physics, other frame)

**3. Numerical check (always do this).** [V_s] = Ṫ T⁻¹, so with a central difference

    ∂T/∂qᵢ ≈ (T(q + h eᵢ) − T(q − h eᵢ)) / 2h,      column i ≈ vee(∂T/∂qᵢ · T⁻¹)

Error O(h²); h = 1e-6 gives ~1e-9 accuracy. Body: vee(T⁻¹ · ∂T/∂qᵢ). If analytic
and numeric disagree, the analytic one is wrong (or your FK is).

**4. Why "space twist" ≠ "gripper velocity".** v in V_s = (ω, v_s) is the velocity
of the body point *currently at the base origin*, not of the gripper. That's
convenient algebra but rarely what a controller wants.

**5. The geometric Jacobian.** Velocity of the gripper point p, written in world
axes: rigid-body motion gives ṗ = v_s + ω × p = v_s − [p] ω. So

    J_geo = [ J_v ]  =  [ J_s,lower − [p] J_s,upper ]      (3 x n linear)
            [ J_ω ]     [ J_s,upper                 ]      (3 x n angular)

This is the "classic" Jacobian of Siciliano/Craig (for revolute joints
column i = [zᵢ₋₁ × (p − oᵢ₋₁); zᵢ₋₁]) and exactly what MuJoCo's
`mj_jacSite(model, data, jacp, jacr, site_id)` returns. Note the order: MuJoCo
and most controllers put linear first; Modern Robotics twists put angular first.
Mixing them is a classic bug. A test compares yours with MuJoCo (call
`mj_forward` first: `mj_kinematics` alone leaves the Jacobian inputs unset and
you'd get zeros — we tried).

## Task

Implement `jacobian_space`, `jacobian_body`, `space_to_body_jacobian`,
`numerical_jacobian_space`, `numerical_jacobian_body`, `geometric_jacobian`,
`numerical_position_jacobian`.

    python -m labs.manipulators check lab09
