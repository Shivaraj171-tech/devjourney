# Lab 15 · UR5e IK: reach a set of poses, verify everywhere

Module 4 (inverse kinematics) · 220 XP (boss lab) · MuJoCo part runs if `mujoco` is installed

## Intuition

A work cell hands you a list of poses: pick here, place there, present the
part to a camera tilted like this. Your job is to turn each one into joint
angles the robot can actually use, and to *prove* they're right before anything
moves. That means:

1. **Specify** each pose the way people do: a position plus roll/pitch/yaw.
2. **Solve** it robustly: many seeds, Levenberg–Marquardt (lab 14), joint limits.
3. **Choose** among the up to 8 solutions: the one closest to where the arm
   already is, so consecutive moves are short and nothing flips.
4. **Verify** with tools that share as little code with the solver as possible,
   then **report** errors in units people read: millimetres and degrees.

## Key maths, step by step

**1. Poses from numbers.** T = [R p; 0 1] with R = Rz(yaw) Ry(pitch) Rx(roll)
(lab 02's ZYX convention). Example: a gripper pointing straight down has its
tool z axis along −z_world. Roll = π about x flips z, so `(yaw, 0, π)`, with
yaw spinning the gripper about the vertical.

**2. Reachability first.** The UR5e's wrist centre can't be farther than about
|a₂| + |a₃| ≈ 0.82 m from the shoulder. A target 1 m out is hopeless.
LM will "fail gracefully" (lab 14), but the report must say **NO**, not print
a pose that's 15 cm off.

**3. Seeds and selection.** Seeds are [q_current, then random joint vectors within
the limits] from a *fixed* RNG seed, so runs are reproducible. Run LM from each,
de-duplicate, and pick the closest valid solution:

    q* = argmin |q − q_prev|  over candidates within limits

Seed each pose with the *previous* pose's answer (a campaign, not isolated
problems). Lab 17 shows why: interpolating between solutions on different
branches swings the arm through space.

**4. Error metrics.** For a target T_d and an achieved T:

    position error  e_p = |p − p_d|                 (metres → report mm)
    rotation error  e_R = |log(Rᵀ R_d)|              (the angle of the residual rotation, rad → deg)

Both are frame-independent scalars. Don't compare Euler angles: near gimbal lock
(lab 02) tiny rotations show up as huge Euler differences.

**5. Three independent checks.**
- **Independent FK.** IK used the PoE model (labs 07, 13, 14). Check with
  **DH** FK (lab 06): a different formula for the same arm. If you had a
  bug in `screws_from_dh`, this is where it would show.
- **MuJoCo kinematics.** The MJCF of lab 08, posed at q (`mj_kinematics`),
  site `ee`. It's a third, independent implementation (C, quaternions, its own
  tree), and the errors should be at round-off (~10⁻¹⁰).
- **MuJoCo with physics.** `MujocoSim` (lab 11): a multibody with inertia, servos
  and gravity compensation. Ramp the servo set-point to q over 2 s and hold for 1 s,
  then measure. The arm must *physically* arrive. With these servos and exact
  gravity compensation the static error is essentially zero. Remove `gravcomp`
  in `toolbox/sim.py` and you'll see the servo sag instead.

**6. What the numbers mean.** IK tolerance 10⁻⁹ rad / 10⁻⁹ m is far below anything
physical: a real arm's repeatability is a matter of hundredths of a millimetre (see the
UR5e datasheet), and its calibrated kinematics differ from the nominal DH table by more. Report what you achieved, and remember
that a model only promises its own accuracy.

Further reading: the UR5e also has a closed-form IK with 8 solutions. Hawkins,
"Analytic Inverse Kinematics for the Universal Robots UR-5/UR-10 Arms" (Georgia
Tech technical report, 2013), derives it for the CB-series arms; the e-Series has the same
joint layout with different DH numbers, and `ur_kinematics/src/ur_kin.cpp` in
ros-industrial/universal_robot implements it with a `UR5e_PARAMS` table. It makes a good stretch exercise: compare it with your
multi-start results.

## Task

Implement `make_pose`, `ik_seeds`, `solve_ur5e_pose`, `ik_campaign`,
`mujoco_kinematic_errors`, `drive_mujoco`, `format_report`.

    python -m labs.manipulators check lab15
