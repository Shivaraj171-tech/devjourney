# Lab 18 · Lagrangian dynamics of the 2-link arm

Module 6 (dynamics) · 200 XP · browser twin: Module 6 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Kinematics (Modules 2–5) never asked *what it costs* to move. Dynamics does:
which joint torques τ produce a motion q(t)? The answer always has the same shape:

    τ = M(q) q̈  +  C(q, q̇) q̇  +  g(q)
        inertia     Coriolis and       gravity
                    centrifugal

- **M(q)**, the mass matrix: how hard the arm is to accelerate. It changes with
  the pose. A stretched arm is harder to swing than a folded one.
- **C(q, q̇) q̇**: forces that come from moving at all. Spin the shoulder fast and
  the forearm wants to fly outwards (centrifugal). Move both joints and you get
  cross terms (Coriolis).
- **g(q)**: what it takes to hold the arm still against gravity.

Lagrange's method gets all three from *energies*, without drawing a single
free-body diagram. We do it by hand for the planar 2-link arm, then ask MuJoCo
for the same quantities (`mj_fullM`, `qfrc_bias`). The numbers agree to round-off.

## Key maths, step by step

**Setup.** Links along x in the vertical x–z plane, both joints about −y (so
+q lifts the arm), gravity g along −z. Link i: length lᵢ, mass mᵢ, centre of mass
lcᵢ from its joint, moment of inertia Iᵢ about its COM. Shorthand: c₁ = cos q₁,
s₁₂ = sin(q₁+q₂), and so on.

**1. Positions and velocities of the COMs.**

    p_c1 = lc₁ (c₁, s₁)
    p_c2 = l₁ (c₁, s₁) + lc₂ (c₁₂, s₁₂)

Differentiate: v_ci = J_vi q̇ with

    J_v1 = [[−lc₁s₁, 0], [lc₁c₁, 0]]
    J_v2 = [[−l₁s₁ − lc₂s₁₂, −lc₂s₁₂], [l₁c₁ + lc₂c₁₂, lc₂c₁₂]]

The angular velocities are ω₁ = q̇₁ and ω₂ = q̇₁ + q̇₂: J_ω1 = [1, 0], J_ω2 = [1, 1].

**2. Kinetic energy → M(q).** Each link contributes translational energy
½ mᵢ |v_ci|² plus rotational energy ½ Iᵢ ωᵢ². Both are quadratic in q̇:

    K = ½ q̇ᵀ M(q) q̇,     M(q) = Σᵢ ( mᵢ J_viᵀ J_vi + Iᵢ J_ωiᵀ J_ωi )

M is symmetric and positive definite (K > 0 whenever anything moves). This
Jacobian form works for any arm. That's lab 19's starting point.

**3. Multiply it out for the 2R arm.** |v_c2|² gives l₁² q̇₁² + lc₂²(q̇₁+q̇₂)² +
2 l₁ lc₂ c₂ q̇₁(q̇₁+q̇₂), because the cross term contains cos(q₁ − (q₁+q₂)) = cos q₂. So

    M₁₁ = m₁lc₁² + I₁ + m₂(l₁² + lc₂² + 2 l₁ lc₂ c₂) + I₂
    M₁₂ = M₂₁ = m₂(lc₂² + l₁ lc₂ c₂) + I₂
    M₂₂ = m₂lc₂² + I₂

Only q₂ appears: rotating the whole arm (q₁) doesn't change its shape.

**4. Potential energy → g(q).** P = g (m₁ z_c1 + m₂ z_c2) = g (m₁lc₁s₁ + m₂(l₁s₁ + lc₂s₁₂)), and

    g(q) = ∂P/∂q = [ (m₁lc₁ + m₂l₁) g c₁ + m₂lc₂ g c₁₂ ,   m₂lc₂ g c₁₂ ]

**5. Lagrange's equations → C.** With L = K − P, the equations
d/dt(∂L/∂q̇ₖ) − ∂L/∂qₖ = τₖ give, after expanding d/dt (M q̇) = M q̈ + Ṁ q̇,

    M q̈ + Ṁ q̇ − ½ ∂(q̇ᵀ M q̇)/∂q + g = τ

The middle two terms are quadratic in q̇. A standard way to write them as C q̇ uses the
**Christoffel symbols** cᵢⱼₖ = ½ (∂Mₖⱼ/∂qᵢ + ∂Mₖᵢ/∂qⱼ − ∂Mᵢⱼ/∂qₖ) with
Cₖⱼ = Σᵢ cᵢⱼₖ q̇ᵢ. For the 2R arm the only nonzero derivatives are
∂M₁₁/∂q₂ = 2h and ∂M₁₂/∂q₂ = h, where h = −m₂ l₁ lc₂ s₂. Working through the symbols:

    C(q, q̇) = [[ h q̇₂,  h (q̇₁ + q̇₂) ],
               [ −h q̇₁,  0            ]]

so C q̇ = [h(2q̇₁q̇₂ + q̇₂²), −h q̇₁²]. Read it physically: −h q̇₁² on joint 2 is the
centrifugal pull of a spinning shoulder on the forearm, and 2h q̇₁q̇₂ is Coriolis.

**6. Two checks you can always run.**
- **Ṁ − 2C is skew-symmetric** for the Christoffel C (with Ṁ = Σᵢ ∂M/∂qᵢ q̇ᵢ).
  This is what makes passivity-based controllers work, and it catches a
  wrong C immediately. (C is not unique: other C's give the same C q̇ but break this property.)
- **The equation matches the Lagrangian derivation numerically**: C q̇ must equal
  Ṁ q̇ − ½ ∂(q̇ᵀMq̇)/∂q with finite differences of your own M, and g must equal
  ∂P/∂q.

**7. Ask MuJoCo.** Given the same masses and inertias (`toolbox/models.py`
writes an MJCF with explicit `<inertial>` elements, no damping, no armature),
after `mj_forward`:

- `mujoco.mj_fullM(model, data, M)` fills a dense nv×nv array with M(q) (MuJoCo stores
  it sparse in `data.qM`). In MuJoCo 4.0.1 the signature is (model, data, dst). We
  checked it with `help(mujoco.mj_fullM)`.
- `data.qfrc_bias` = C(q, q̇) q̇ + g(q), the "bias force".

Our measured agreement: 4×10⁻¹⁶ for M and 2×10⁻¹⁶ for the bias, which is round-off.
`mj_inverse` (lab 19) gives the whole τ.

## Task

Implement `com_positions`, `com_jacobians`, `mass_matrix_from_jacobians`,
`planar2r_mass_matrix`, `planar2r_coriolis_matrix`, `planar2r_gravity`,
`planar2r_inverse_dynamics`, `planar2r_energy`, `mujoco_dynamics`.

    python -m labs.manipulators check lab18
