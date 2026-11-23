# Lab 17 · Joint-space vs task-space trajectories on the UR5

Module 5 (trajectories) · 220 XP (boss lab) · MuJoCo part runs if `mujoco` is installed

## Intuition

You have a start pose and a goal pose, and IK (Module 4) gives joint vectors
for both. There are two natural ways to get from one to the other:

- **Joint space**: interpolate the joint angles, q(s) = q_A + s (q_B − q_A).
  It's cheap, always feasible between two valid configurations, never crosses a
  singularity it doesn't have to, and easy to keep within joint limits. But the
  *gripper* moves along a curve. In our test move it bows **8 cm** away from
  the straight line, enough to hit the table or knock the part you're carrying.
- **Task space** (Cartesian): interpolate the *pose*: position on a straight
  line, orientation by slerp (lab 04). The gripper does exactly what you'd draw.
  The cost is an IK solve at every sample, and the joints do whatever
  that requires: near a singularity, arbitrarily fast (lab 10).

Industrial robot languages have both, e.g. `movej` and `movel` on a UR. This lab
builds both, times them with lab 16's profiles, checks the limits and smoothness,
and runs them on the MuJoCo arm.

## Key maths, step by step

**1. Joint-space line + time scaling.** q(t) = q_A + s(t) Δq, Δq = q_B − q_A, so

    q̇(t) = ṡ(t) Δq,     q̈(t) = s̈(t) Δq

Every joint follows the same s(t). They start and finish together, each at its
own speed.

**2. Synchronising a trapezoid across joints.** Joint j's speed is |Δq_j| ṡ. The
limits |q̇_j| ≤ v_j and |q̈_j| ≤ a_j for *all* j become limits on ṡ and s̈:

    ṡ ≤ v_s = min_j v_j / |Δq_j|,      s̈ ≤ a_s = min_j a_j / |Δq_j|

So run lab 16's trapezoid for "distance" 1 with (v_s, a_s). The binding joint
moves at its limit, and the others go proportionally slower and arrive at the
same instant. Skip joints with Δq_j = 0 (they'd divide by zero; they don't
constrain anything).

**3. Task-space interpolation.** For s ∈ [0, 1]:

    p(s) = p_A + s (p_B − p_A)
    R(s) = slerp(R_A, R_B, s)  =  R_A exp( s · log(R_Aᵀ R_B) )

The second form shows what slerp is: rotate at constant angular velocity
about one fixed axis (the body-frame axis of R_Aᵀ R_B). Implement it with
quaternions (`matrix_to_quat`, `quat_slerp`, `quat_to_matrix`). A test checks
it against the exp/log form.

**4. Pose path → joint path.** At each sample, solve IK for T(s(t_k))
**warm-started from q_{k−1}**. Two reasons: (a) consecutive poses are close, so
LM converges in 2–3 iterations; (b) the solver stays on the *same branch*
(lab 14). Seeding from scratch could hop to a different one of the 8 solutions
mid-move, which is a physical disaster. Finally `np.unwrap` the result along
time, so that a joint crossing ±π doesn't show up as a 2π jump.

**5. Checking limits and smoothness numerically.** From samples every dt, central
differences (`np.gradient`) give

    q̇_k ≈ (q_{k+1} − q_{k−1}) / 2dt,    then the same again for q̈ and the jerk

The limit check is the worst ratio max |q̇|/v_max and max |q̈|/a_max over all joints
and samples (≤ 1 is OK). Our UR5 limits (`toolbox/robots.py`): 180°/s (the UR5
datasheet speed as we recall it) and an acceleration limit of 2π rad/s² that we chose
ourselves. The Cartesian move
over 2 s uses 30% of the velocity limit. Squeeze it into 0.4 s and it needs 7× the
allowed acceleration. A task-space trajectory has to be checked in joint space.

**6. Tracking in MuJoCo.** Stream q_k to the servos of `MujocoSim` (lab 11) by
commanding q̇ = (q_{k+1} − q_k)/dt for each step of dt. The servo lags the
set-point a little (≈ 0.01 rad here, mostly *along* the path). The gripper's
distance from the line stays at 0.1 mm for the Cartesian move and the joint-space
move still bows 8 cm. The simulator confirms that the geometry, not the
controller, makes the difference.

## Task

Implement `joint_trajectory`, `sync_trapezoid`, `trapezoid_joint_trajectory`,
`cartesian_poses`, `cartesian_trajectory`, `finite_differences`, `limit_check`,
`ee_positions`, `track_in_mujoco`.

    python -m labs.manipulators check lab17
    python -m labs.manipulators visual lab17   # gripper paths and joint velocities, both methods
