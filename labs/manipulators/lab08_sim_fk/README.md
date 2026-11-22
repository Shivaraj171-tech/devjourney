# Lab 08 · Validate your FK against a physics simulator (MuJoCo)

Module 2 · 180 XP · needs `mujoco` (tests are *skipped*, not passed, without it)

## Intuition

Your FK passes unit tests, but would it match a robot? In practice you validate
kinematics against an independent implementation: the vendor's controller, a
URDF in ROS, or a simulator. Here you write the arm as an **MJCF** model (MuJoCo's
XML format), let MuJoCo's own kinematics place the bodies, and compare its
end-effector pose with your `fk_dh` at many random configurations. Agreement to
~1e-12 means both are right (or wrong in exactly the same way, which is very
unlikely for two independent code paths).

This is also your bridge to RL: the same `MjModel`/`MjData` pair is what
Gymnasium's MuJoCo environments and MuJoCo Playground step under the hood.

## Key maths and modelling, step by step

**1. How MuJoCo places bodies.** An MJCF `<body pos="..." quat="...">` gives the
body's frame *relative to its parent* at q = 0. A `<joint type="hinge"
axis="0 0 1">` inside it rotates the body (and all its children) about the local
z axis through the body origin. So a body chain composes as

    T_world,body_i(q) = T_world,body_{i−1}(q) · T_fixed,i · Rz(q_i)

**2. Match it to DH.** DH says T_{i−1,i} = Rz(θᵢ) · [Tz(dᵢ) Tx(aᵢ) Rx(αᵢ)], with
θᵢ = qᵢ + offsetᵢ. Group the factors differently:

    T_0n = Rz(off₁)Rz(q₁) · C₁ · Rz(off₂)Rz(q₂) · C₂ · … · Rz(offₙ)Rz(qₙ) · Cₙ
           \_ body 1 _/        \__ body 2 __/              \__ body n __/    site

where Cᵢ = Tz(dᵢ) Tx(aᵢ) Rx(αᵢ) is the constant part of link i. So:
- body 1 sits at Rz(off₁) in the world;
- body i sits at C_{i−1} · Rz(offᵢ) in body i−1;
- the end-effector site sits at Cₙ in body n.

**3. MJCF gotchas (each one has bitten real projects).**
- `quat` is **w x y z** (scalar first), same as lab 04.
- Angles in `euler=`/`axisangle=`/joint `range=` are **degrees by default**.
  Add `<compiler angle="radian"/>` or use `quat` everywhere.
- A body with no mass can't be simulated: give each body a small geom with mass.
- Write numbers with full precision (`f"{x:.17g}"`) or your 1e-9 test will fail.

**4. Kinematics without physics or rendering.** `mujoco.mj_kinematics(model,
data)` computes all body/site poses from `data.qpos` only (no forces, no
window). Results: `data.site("ee").xpos` (3,) and `data.site("ee").xmat`
(9,, row-major 3x3). `mj_forward` would also compute velocities, forces and the
quantities the Jacobian functions need (lab 09).

**5. Error metric.** Position: ‖p_sim − p_fk‖. Rotation: the angle of the relative
rotation R_simᵀ R_fk, i.e. ‖log(R_simᵀ R_fk)‖ (lab 03), not a difference of
matrix entries.

## Task

Implement `link_constant`, `dh_to_mjcf`, `load_model`, `sim_site_pose`,
`pose_error`, `compare_with_sim`. Then try it yourself:

    python -m labs.manipulators check lab08
    python -c "from labs.manipulators.lab08_sim_fk.starter import dh_to_mjcf; \
    from labs.manipulators.toolbox import UR5_DH; print(dh_to_mjcf(UR5_DH))" > /tmp/ur5.xml
    python -m mujoco.viewer --mjcf=/tmp/ur5.xml      # optional, needs a display

(The blocking viewer above works with plain `python`; on macOS, scripts that use
`mujoco.viewer.launch_passive` must be run with `mjpython`. The viewer is
optional; the tests never open a window.)
