# Lab 19 · Recursive Newton–Euler inverse dynamics

Module 6 (dynamics) · 220 XP · browser twin: Module 6 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Lab 18's Lagrangian route is beautiful for 2 joints and hopeless for 6: M(q)
of the UR5 written out by hand runs to pages. Controllers need τ for
*any* arm, a thousand times per second. The **recursive Newton–Euler algorithm**
(RNEA; Luh, Walker & Paul, 1980) does it in O(n), using nothing but rigid-body
physics, link by link:

1. **Outward pass** (base → tip): each link's velocity and acceleration is the
   previous link's, carried across the joint, plus what this joint adds.
   Gravity enters as a trick: pretend the base accelerates *upwards* at g.
2. **Inward pass** (tip → base): Newton–Euler for each link gives the wrench it
   needs. The joint must supply that plus whatever the outer links pull on it.
   τᵢ is the part of that wrench along joint i's axis.

We use the **twist form** (Lynch & Park, *Modern Robotics* sec. 8.3), because it
reuses everything from labs 07 and 09: screws, adjoints, exp. The referee is
MuJoCo's own inverse dynamics, `mj_inverse`, on a model with the same masses
and inertias.

## Key maths, step by step

**0. Frames and data.** Put a frame {i} at link i's centre of mass, with the
orientation of DH frame i. At home (q = 0) its pose is Mᵢ (`com_frames`). Frame
{n+1} is the end effector. Write M_{i−1,i} = M_{i−1}⁻¹ Mᵢ (frame 0 = base). Link i has
**spatial inertia**

    Gᵢ = [ Iᵢ  0  ]      (6×6 in (ω, v) order; Iᵢ = diag(Ixx, Iyy, Izz) about the COM)
         [ 0  mᵢ𝟙 ]

so its kinetic energy is ½ Vᵢᵀ Gᵢ Vᵢ and its momentum is Gᵢ Vᵢ (twists Vᵢ in frame {i}).
Joint i's screw axis in frame {i} is Aᵢ = Ad_{Mᵢ⁻¹} Sᵢ (lab 07's Sᵢ, re-expressed).

**1. Neighbouring frames.** Joint i turns frame {i} about Aᵢ, so

    T_{i,i−1}(qᵢ) = e^{−[Aᵢ] qᵢ} M_{i−1,i}⁻¹

**2. Outward: twists.** A link moves like its parent, plus its own joint:

    Vᵢ = Ad_{T_{i,i−1}} V_{i−1} + Aᵢ q̇ᵢ,          V₀ = 0

**3. Outward: accelerations.** Differentiate step 2. The adjoint changes with qᵢ
(d/dt Ad_{T_{i,i−1}} X = −ad_{Aᵢq̇ᵢ} Ad_{T_{i,i−1}} X), and with ad_X Y = −ad_Y X this
becomes the "velocity product" term:

    V̇ᵢ = Ad_{T_{i,i−1}} V̇_{i−1} + ad_{Vᵢ} Aᵢ q̇ᵢ + Aᵢ q̈ᵢ

with the Lie bracket ad_V = [[ [ω], 0 ], [ [v], [ω] ]]. **Gravity trick:** set
V̇₀ = (0, −g_vec) = (0, 0, 0, 0, 0, +9.81). An upward-accelerating base is
indistinguishable from gravity (Einstein's elevator), and the inertia terms
then include the weight automatically.

**4. Inward: wrenches.** The rate of change of a rigid body's momentum,
written in a moving frame, is d/dt (G V) − ad_Vᵀ (G V). Newton–Euler for link i
balances that against the wrench Fᵢ from its joint and the wrench passed back from
link i+1, F_{i+1}, moved into frame {i} by the transpose adjoint (wrenches transform
dually to twists):

    Fᵢ = Ad_{T_{i+1,i}}ᵀ F_{i+1} + Gᵢ V̇ᵢ − ad_{Vᵢ}ᵀ (Gᵢ Vᵢ),     F_{n+1} = F_tip

**5. Project onto the joint.** Only the component along the joint's own axis is
supplied by the motor (the bearings take the rest):

    τᵢ = Fᵢᵀ Aᵢ

**6. RNEA gives more than τ.** Run it with special inputs:
- q̇ = 0, q̈ = eⱼ, no gravity ⇒ column j of **M(q)**;
- q̈ = 0 ⇒ the **bias** C(q,q̇)q̇ + g(q) (MuJoCo's `qfrc_bias`);
- q̇ = q̈ = 0 ⇒ **g(q)**, gravity compensation.

The tip wrench adds exactly J_bᵀ F_tip (body Jacobian, lab 09). A test checks it:
statics falls out as a special case.

**7. Ask MuJoCo.** Set `data.qpos`, `data.qvel`, `data.qacc`, then
`mujoco.mj_inverse(model, data)`. The result is `data.qfrc_inverse`
(the generalised force that would produce qacc; with no damping, armature,
contacts or passive forces in our model it is exactly τ). We confirmed the
signature with `help(mujoco.mj_inverse)` in 4.0.1: "Inverse dynamics: qacc must
be set before calling". Our measured agreement is 2×10⁻¹⁵ (3-DOF) and 3×10⁻¹⁴ N·m (UR5).

**8. The 2R arm again.** Lab 18's arm is a DH chain with rows
(l₁, 0, 0, 0), (l₂, 0, 0, 0) in the horizontal x–y plane. With gravity along −y it's the
same mechanism, and RNEA must reproduce lab 18's closed form to round-off.

Model data: `toolbox/robots.py` (`ARM3_LINKS` are our own numbers; `UR5_LINKS` are
UR5-like masses and centres of mass with our own cylinder inertias, see the comment
there). MuJoCo models: `toolbox/models.py` (explicit `<inertial>`, no damping).

## Task

Implement `ad_twist`, `spatial_inertia`, `com_frames`, `rnea_model`, `rnea`,
`mass_matrix_rnea`, `bias_forces_rnea`, `gravity_rnea`, `mujoco_inverse`.

    python -m labs.manipulators check lab19
