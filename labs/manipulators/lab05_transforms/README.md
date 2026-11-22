# Lab 05 · Homogeneous transforms and frame chains

Module 1 · 120 XP · browser twin: Module 1, "Rigid transforms"

## Intuition

A pose is "where is it **and** which way does it face": rotation R plus
position p. Robots are chains of poses: world → base → shoulder → … → gripper →
camera. Packing (R, p) into one 4x4 matrix turns "move then rotate then move…"
into plain matrix multiplication, and lets one `@` carry a point through the whole
chain. The set of all such matrices is **SE(3)**.

## Key maths, step by step

**1. Change of frame for a point.** If frame b sits at p_ab with orientation R_ab
inside frame a, a point with coordinates x_b in b has coordinates

    x_a = R_ab x_b + p_ab

**2. Make it linear.** Append a 1 to the point (homogeneous coordinates):

    [x_a]   [R_ab  p_ab] [x_b]
    [ 1 ] = [ 0     1  ] [ 1 ]        T_ab = [[R, p], [0, 1]]

The 1 is what lets the translation ride along. Direction vectors (velocities,
axes) get a 0 instead, so they rotate but don't translate.

**3. Composition.** Apply step 1 twice: x_a = R_ab(R_bc x_c + p_bc) + p_ab
= (R_ab R_bc) x_c + (R_ab p_bc + p_ab). That's exactly the block product, so

    T_ac = T_ab T_bc        (subscripts cancel, as for rotations)

**4. Inverse, derived.** Solve step 1 for x_b: x_b = R_abᵀ(x_a − p_ab) = R_abᵀ x_a − R_abᵀ p_ab. So

    T_ab⁻¹ = T_ba = [[Rᵀ, −Rᵀ p], [0, 1]]

Cheaper and more accurate than a general 4x4 inverse, and it always returns a
valid SE(3) element. (A common bug: writing −p instead of −Rᵀp.)

**5. Relative pose.** Two objects both known in the world frame (say from a
motion-capture system or MuJoCo's `data.xpos/xmat`): the pose of b seen from a is

    T_ab = T_aw T_wb = T_wa⁻¹ T_wb

This is how you compute "where is the cube relative to my gripper" for an RL
observation.

## Task

Implement `make_transform`, `split_transform`, `is_transform`,
`transform_inverse` (closed form — a test forbids `np.linalg.inv`),
`transform_points` (single point and N×3 batch), `chain`, `relative_transform`.

    python -m labs.manipulators check lab05

Module 1 is complete after this lab: you've earned the toolbox used from
Module 2 on (`labs/manipulators/toolbox`).
