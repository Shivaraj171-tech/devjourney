# Lab 28 · Capstone: pick and place

Module 8 (grasping) · 300 XP · browser twin: Module 8 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Everything comes together. A UR5e with a two-finger gripper stands on a table next to
a 4 cm cube. It has to pick the cube up and put it down somewhere else, at a chosen
orientation, **holding it by friction alone**: no welds, no "attach" trick, no
teleporting. If your grasp is wrong, the cube slips out, exactly as lab 26 predicts.

The recipe is the one real robot programmers use:

1. **Where** must the gripper be? Poses above, at and over the box and the target (Module 1).
2. **Which joints** put it there? Inverse kinematics, one consistent branch (Modules 2–4).
3. **How** to get there smoothly? Rest-to-rest quintics between those joint configurations (Module 5).
4. **Which torques** make the arm follow? Computed-torque control on the dynamics (Modules 6–7).
5. **How hard** to squeeze? Enough that friction carries the load with margin (Module 8).

## Key maths, step by step

**1. The tool frame.** The UR5e's end-effector frame is its flange (DH frame 6). The point
that matters is the **tool centre point (TCP)** between the finger pads, GRIPPER_TCP = 10 cm
further along the flange's z axis. Move the home configuration: M_tool = M · Tz(0.10). The
space screws S don't change (the joints didn't move), but the **body** screws do, since they're
expressed in the tool frame: B_tool = body_screws(M_tool, S) (lab 07). Now IK solves for the
TCP directly.

A top-down grasp has the tool z axis along world −z. Start from Rx(π) (flip z, and y with it)
and turn about the world vertical by the grasp yaw ψ: **R = Rz(ψ) Rx(π)**. The fingers
close along R's y axis, (sin ψ, −cos ψ, 0).

**2. Use the symmetry.** A cube is the same every quarter turn, so the gripper can grasp at
ψ = box_yaw + kπ/2 for any k. Pick the k that puts ψ closest to the wrist's yaw at home (π/2)
so the wrist turns as little as possible. Placing it at target_yaw means turning the wrist by
wrap(target_yaw − box_yaw) while carrying.

**3. Waypoints by IK.** Six TCP poses: **pre** (12 cm above the box), **grasp** (TCP 5 mm
above the box's centre, so the 3 cm pads clear the table), **lift** (20 cm), **carry** (20 cm over the
target, place yaw), **place** (grasp height + 2 mm) and **retreat** (20 cm). Solve each with
lab 14's `ik_lm` within the joint limits, **warm-started from the previous solution**. The
UR5e has up to 8 IK solutions per pose, and warm-starting keeps every waypoint on the same branch
(no elbow flips mid-task: the test checks no joint jumps by more than 2 rad).

**4. A piecewise trajectory.** Eight rest-to-rest segments in joint space:

| # | from → to | time | gripper |
|---|---|---|---|
| 0 | home → pre | 1.5 s | open |
| 1 | pre → grasp | 1.0 s | open |
| 2 | hold at grasp | 0.5 s | **close** |
| 3 | grasp → lift | 1.0 s | close |
| 4 | lift → carry | 1.5 s | close |
| 5 | carry → place | 1.0 s | close |
| 6 | hold at place | 0.4 s | **open** |
| 7 | place → retreat | 0.8 s | open |

Each is lab 16's quintic. Velocity and acceleration are zero at both ends, so the
segments join without jumps in the commanded acceleration, which computed torque turns
directly into torque. The vertical descents are short joint-space moves. They aren't exact
straight lines in Cartesian space (lab 17), but over 10 cm with the wrist pointing down the
deviation is well under the pads' clearance.

**5. The controller.** Lab 23's computed torque on the six arm joints, ωₙ = 20 rad/s
(Kp = 400, Kd = 40), plus a **force** command on the fingers: −5 N holds them open against
their stops, +15 N squeezes. The model M(q) and C q̇ + g come from `MujocoDynamics`, i.e.
MuJoCo's own `mj_fullM`/`qfrc_bias` for the arm block. Lab 19 showed your RNEA gives the same
numbers for the bare arm. Here the gripper adds bodies that `UR5E_LINKS` doesn't have, and RNEA
on 6 joints at 1 kHz would make the test slow. The controller does **not** know about the cube:
its weight acts as a disturbance (lab 23 step 5), and the feedback absorbs it.

**Lab 26 says how hard to squeeze.** The cube has m = 0.1 kg and N = 15 N per finger, so
μ_min = mg/(2N) = 0.033. The pads have μ = 1, a factor of 30 to spare for the arm's
accelerations, the creep of soft contacts, and the off-centre grasp. The pads also use
`condim="4"` (torsional friction): lab 27 showed two point contacts can't resist a twist
about the finger axis, and soft fingers can.

**6. Run it.** `toolbox.models.ur5e_gripper_mjcf(UR5E_DH, UR5E_LINKS, box_xy, box_yaw, mu=mu)`
builds the scene: 8 actuators (6 arm motors, 2 finger motors), qpos = 6 arm joints, 2 fingers,
then the cube's free joint. Lab 21's `run_mujoco_control` drives all 8 actuators (it reads the
first `nu` = 8 joints), and its `before_step` hook logs `data.xpos[box]`, `data.xquat[box]` and
the `tcp` site every step. Run for the plan's 7.7 s plus 0.3 s of settling.

**7. Did it work?** Placement error = horizontal distance from the target, plus the yaw error
modulo π/2 (the cube's symmetry: wrap(4Δψ)/4). The yaw of a quaternion (w, 0, 0, z) is
2 atan2(z, w). "Held during transport" = the largest box–TCP distance from the end of the lift
to the end of the lowering. A dropped box would show tens of centimetres.

## What we measured

10 randomised trials (box start ±3 cm and ±0.5 rad, target yaw ±0.5 rad, seeds 0–9): **10/10
placed**, horizontal error 0.6–8.3 mm, yaw error < 0.7 mrad, box–TCP distance during
transport ≤ 12 mm (it includes the 5 mm by which the TCP sits above the box centre, and the cube
settling between the pads as they close). One run takes about 0.4 s of computer time for
8 s of simulation.

Friction sweep (same trial, N = 15 N, μ_min = 0.033): μ = 0.02 drops the box as soon as the
arm lifts (it stays 37 cm from the target), while μ = 0.05, 0.1, 0.3 and 1 all place it within
2 mm. A squeeze of 0.5 N at μ = 1 (μ_min = 0.98) also loses the box. Both tests are lab 26's
inequality, now in a moving hand.

## Simplifications (and why)

- **Contact parameters tuned once, not per test:** elliptic friction cones, `impratio="10"`
  (stiffer friction, less creep: lab 26) and `condim="4"` on the pads. Defaults
  (pyramidal cones, impratio 1) also hold this box, but they creep about ten times faster.
- **The arm's model comes from MuJoCo** (`MujocoDynamics`), not your RNEA (step 5).
  It's an exact model of the arm and gripper, but it doesn't include the cube.
- **Arm links don't collide** with anything. Only the pads, the cube and the table do. The
  waypoints keep the arm well clear, so the omission isn't hiding anything. It just keeps
  the contact set small.
- **The gripper is force-controlled,** not position-controlled: a constant squeeze is exactly
  the N in μ ≥ mg/(2N).

## Task

Implement `tool_model`, `tool_pose`, `grasp_yaw`, `plan_waypoints`, `plan_segments`,
`segment_reference`, `make_controller`, `run_pick_and_place`, `placement_error`,
`held_during_transport`.

    python -m labs.manipulators check lab28
    python -m labs.manipulators visual lab28   # box and gripper during the task (needs MuJoCo)
