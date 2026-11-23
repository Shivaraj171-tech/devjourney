# Robot manipulator labs: laptop edition (Modules 1–8)

Twenty-eight hands-on labs that take you from rotation matrices, through a UR5e that
draws a straight line in a physics simulator, inverse kinematics, trajectories and a
rigid-body simulator of your own that matches MuJoCo to round-off, to torque controllers
you tune and measure, and finally a UR5e that picks up a box and puts it down somewhere
else, held by friction alone. Each lab follows
the same rhythm: **intuition → key maths derived step by step → you implement it → tests check it**
(and from Module 2 on, a real simulator checks it too).

This folder stands alone. It doesn't use or change the DevJourney web app, and the
app doesn't need it. The browser track covers the same modules in plain Python. These
labs are the "real tools" version: numpy, pytest and the
[MuJoCo](https://mujoco.org) physics engine, running on your machine.

## Setup (about 2 minutes)

You need Python 3.10+ (we verified with 3.13). Run these from the **repo root**, the
folder that contains `labs/` and `coach/`:

```bash
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r labs/manipulators/requirements.txt
python labs/manipulators/tools/verify_all.py   # sanity check: should end "28/28 labs verified."
python -m labs.manipulators                    # the lab menu
```

`requirements.txt` pins the versions we installed and ran: numpy 2.5.5, pytest 9.2.0,
mujoco 4.0.1 and matplotlib 3.11.2. `.venv/` is already in `.gitignore`.

- **MuJoCo is optional but recommended.** Without it, simulator tests are *skipped*
  (never silently passed). Lab 08 can't be completed, and the MuJoCo parts of labs
  04, 09, 11, 15, 17–26 and 28 don't run. Everything else works with numpy alone
  (`verify_all` then reports "27/28 labs verified, 1 skipped").
- **matplotlib is optional.** It's only used by `visual`.
- Everything runs **headless**. No window is opened, and no GPU or OpenGL is needed.
  To look at a model, `python -m mujoco.viewer --mjcf=file.xml` opens the
  interactive viewer if you have a display (see lab 08).

## The labs

Times are rough estimates for a first pass (reading, deriving, coding, debugging);
the tests themselves run in 0.2–5 s per lab.

| # | Lab | Module | XP | Time | Uses MuJoCo |
|---|---|---|---|---|---|
| 01 | Rotation matrices and SO(3) | 1 Rigid-body motion | 100 | 1 h | |
| 02 | Euler ZYX angles and gimbal lock | 1 | 100 | 1 h | |
| 03 | Axis-angle, Rodrigues, exp/log on SO(3) | 1 | 120 | 1.5 h | |
| 04 | Quaternions and slerp | 1 | 120 | 1.5 h | cross-check with `mju_mulQuat` |
| 05 | Homogeneous transforms and frame chains | 1 | 120 | 1 h | |
| 06 | DH forward kinematics: 3-DOF arm + UR5e | 2 Forward kinematics | 150 | 1.5 h | |
| 07 | Product of exponentials; DH == PoE | 2 | 180 | 2 h | |
| 08 | Write an MJCF model, validate FK in MuJoCo | 2 | 180 | 2 h | **required** |
| 09 | Space, body and geometric Jacobians | 3 Velocity kinematics | 180 | 2 h | cross-check with `mj_jacSite` |
| 10 | Singularities and manipulability ellipsoids | 3 | 150 | 1.5 h | |
| 11 | Resolved-rate control: straight line in sim | 3 | 200 | 2 h | MuJoCo multibody + numpy robot |
| 12 | Analytic IK of the 3-DOF arm: 4 solutions, elbow up/down | 4 Inverse kinematics | 150 | 1.5 h | |
| 13 | Numerical IK: Newton–Raphson on the body twist | 4 | 180 | 1.5 h | |
| 14 | Damped least squares / Levenberg–Marquardt, limits, choosing | 4 | 200 | 2 h | |
| 15 | UR5e IK campaign: poses → joints, verified 3 ways | 4 | 220 | 2 h | MJCF kinematics + servoed arm |
| 16 | Cubic, quintic and trapezoidal time scaling | 5 Trajectories | 150 | 1.5 h | |
| 17 | Joint-space vs Cartesian trajectories on the UR5e | 5 | 220 | 2.5 h | tracked by the servoed arm |
| 18 | Lagrangian dynamics of the 2-link arm: M, C, g | 6 Dynamics | 200 | 2.5 h | `mj_fullM`, `qfrc_bias`, energy |
| 19 | Recursive Newton–Euler inverse dynamics (3-DOF, UR5e) | 6 | 220 | 2.5 h | `mj_inverse` |
| 20 | Forward dynamics: Euler, semi-implicit, RK4, energy | 6 | 250 | 2.5 h | MuJoCo `RK4`/`Euler` trajectories |
| 21 | Independent joint PD: step responses, gains vs overshoot, gravity droop | 7 Control | 150 | 2 h | torque `<motor>`s; your control loop |
| 22 | PD + gravity compensation; why it's stable (Lyapunov) | 7 | 180 | 2 h | 2R and 3-DOF arm, RNEA gravity |
| 23 | Computed-torque control along a quintic; 20% wrong masses | 7 | 220 | 2.5 h | 2R and 3-DOF arm, RNEA model |
| 24 | Task space: Jacobian transpose, operational space, orientation error | 7 | 220 | 2.5 h | 3-DOF arm, UR5e pose control |
| 25 | Impedance control: push it, measure K, press on a table | 7 | 220 | 2.5 h | `xfrc_applied`, contacts, `mj_contactForce` |
| 26 | Grasp basics: friction cones, grasp matrix, two-finger threshold | 8 Grasping | 180 | 2 h | a pinched box held or dropped |
| 27 | Grasp quality: force closure, σ_min, the ε-metric | 8 | 200 | 2.5 h | |
| 28 | Capstone: pick and place with the UR5e | 8 | 300 | 3–4 h | UR5e + two-finger gripper + box |

Module map: **1** rigid-body motion (01–05) → **2** forward kinematics (06–08) →
**3** velocity kinematics (09–11) → **4** inverse kinematics (12–15) →
**5** trajectories (16–17, which use lab 14's IK) → **6** dynamics (18–20, which reuse
labs 07 and 09: screws, adjoints, Jacobians) → **7** control (21–25, which drive the
dynamics of Module 6 with torques: PD, gravity compensation, computed torque, task-space and
impedance control) → **8** grasping (26–28: contacts and friction, grasp quality, then a
pick-and-place capstone that uses IK, trajectories, control and grasping together).
Modules 4 and 6 can be done in either order once Module 3 is done. Module 7 needs 6;
labs 26–27 need only Module 1 and lab 09, and lab 28 needs everything.
Module 7 takes about 11.5 h and Module 8 about 8 h; all eight modules come to roughly 55 h.

The arm is Universal Robots' **UR5e** (e-Series). Its DH table, joint limits, masses,
centres of mass and full inertia tensors come from Universal Robots' own ROS 2 description
package (`UniversalRobots/Universal_Robots_ROS2_Description`, tag 4.4.1, BSD-3-Clause),
cross-checked against `ur_kinematics`' `UR5e_PARAMS` in ros-industrial/universal_robot; the
sources, commits and the checks we ran are in `toolbox/robots.py`. The 3-DOF arm uses our
own stated dimensions. For the dynamics labs, the 3-DOF arm's and the 2-link arm's masses
and inertias are our own. MuJoCo gets the same numbers (`toolbox/models.py`), so
every dynamics check compares like with like. In Modules 7–8 the contact settings
(elliptic friction cones, `impratio="10"`, torsional friction on the gripper pads) were
chosen once and are explained in labs 26 and 28. The gains and every number quoted in
those READMEs come from our own runs (MuJoCo 4.0.1).

Each `labXX_*/` folder contains:

- `README.md`: intuition, derivation and the task
- `starter.py`: **your file**, with `TODO`s that raise `NotImplementedError`
- `tests/`: pytest tests that are deterministic (fixed seeds), compare with
  tolerances and fail with a message that says what's wrong
- `hints.json`: three staged hints
- `solution.py`: the reference solution. The menu never shows it (see `--reveal`).
- `visual.py` in labs 02, 04, 06, 10–13, 16, 17, 20–28: saves a PNG made with *your* code
  (25, 26 and 28 need MuJoCo for theirs)

From lab 02 on, starters import earlier building blocks from `labs/manipulators/toolbox`,
so a bug in lab 03 can't break lab 07. **The toolbox re-exports the reference
solutions, so finish a lab before you read its toolbox code.**

## The CLI, XP and badges

```bash
python -m labs.manipulators                 # status + interactive menu
python -m labs.manipulators show lab03      # read the lab
python -m labs.manipulators check lab03     # run the tests on your starter.py; first pass awards XP
python -m labs.manipulators check lab03 -v  # full pytest output
python -m labs.manipulators hint lab03      # next staged hint (costs XP)
python -m labs.manipulators visual lab11    # PNG to ~/.devjourney-labs/plots/
python -m labs.manipulators show lab03 --reveal   # solution, only after 3 failed checks
python -m labs.manipulators status | reset
```

Lab names are flexible: `lab03`, `3` and `lab03_axis_angle` all work.

- **XP.** The first passing `check` awards the lab's XP (100–300; 5060 in all).
- **Hints** cost 5, 10 and then 20 XP for stages 1, 2 and 3. Re-reading a hint you
  already bought is free. Hints are free once you've passed the lab.
- **Reveal** unlocks after 3 failed checks. If you reveal before passing, the lab
  still counts as complete when you pass it, but it earns 0 XP.
- **Ranks**: Novice → Apprentice (300) → Technician (700) → Engineer (1100) →
  Researcher (1500) → Senior Researcher (2200) → Principal Investigator (3000) →
  Lab Director (3900) → Distinguished Roboticist (4800).
- **Badges**: First Light, One Shot (pass on the first check), Purist (3 labs with no
  hints); one per module: Frame Wrangler, Chain Forger, Jacobian Whisperer, Pose
  Hunter, Smooth Operator, Equations of Motion, Steady Hand (control) and Firm Grip
  (grasping); with MuJoCo actually running: Sim Validated (lab 08), Straight Shooter
  (lab 11), Torque Matched (lab 19), Digital Twin (lab 20), Soft Touch (lab 25) and
  Pick and Place (lab 28); and Manipulator Graduate (all 28 labs).
- Progress is stored in `~/.devjourney-labs/manipulators-progress.json` (override with
  `DEVJOURNEY_LABS_HOME`). Delete the file, or run `reset`, to start over.

You can also run the tests without the CLI:
`pytest labs/manipulators/lab03_axis_angle` tests your starter, and
`LAB_TARGET=solution pytest …` tests the reference.

## How this pairs with the browser track

The web app's Manipulators track teaches the same ideas in the browser (Pyodide, no
install). At the time of writing only its Module 1 is live; the later modules are
planned, and each lab README names the module that will be its twin. Each lab README names its "browser twin". A good loop:

1. Do the browser lesson for the intuition and quick exercises.
2. Do the laptop lab for the full derivation, numpy and the simulator check.
3. Come back to the browser for the next module.

Both tracks use the same conventions: twists are (ω, v), quaternions are [w, x, y, z],
and DH means standard (distal) DH.

## Working with the coach and Claude Code

The local coach (`coach/README.md`) turns code changes that Claude Code makes into
short learning cards. The labs are written to suit it: small, single-purpose,
documented functions, so the coach's grounding (diff plus the enclosing function)
captures a whole idea.

- `labs/manipulators/CLAUDE.md` puts Claude Code in **tutor mode** in this folder. It
  explains and asks questions instead of filling in your TODOs, unless you
  explicitly ask it to write the code. Combined with the coach's
  `learn-with-coach` output style (which leaves a `TODO(human)` for you), every
  change becomes a card and the key lines stay yours to write.
- Good prompts: *"explain why log_so3 needs a special case at π"* or *"review my
  `jacobian_space` against README step 1, don't fix it"*.
- The coach's `predict_output` questions only run pure-stdlib snippets, so numpy
  code gets explanation cards rather than "what does this print?" questions.
  That's expected.

## For maintainers

```bash
python labs/manipulators/tools/verify_all.py   # every lab: starter must fail (all tests,
                                               # with TODO messages), solution must pass, < 10 s
```

The MuJoCo robot for labs 11, 15 and 17 lives in `toolbox/sim.py`. It's built from the
lab 08 MJCF and adds position servos, joint damping, armature and gravity compensation.
The dynamics labs (18–20) use `toolbox/models.py` instead: MJCF with explicit
`<inertial>` elements from `toolbox/robots.py`, and no damping, armature, contacts or
actuators, so MuJoCo's equations of motion are exactly M q̈ + C q̇ + g = τ.
Module 7 adds torque `<motor>` actuators to those same models (`with_motors`), so the
controllers command exactly τ; `pendulum_mjcf` (one link), `arm3_table_mjcf` (fingertip
and table), `pinch_mjcf` (two force-driven fingers and a box) and `ur5e_gripper_mjcf` (the
lab 28 scene) are the contact rigs. `toolbox/sim.py`'s `MujocoDynamics` evaluates M(q)
and g(q) with MuJoCo for the UR5e controllers (equal to the lab 19 RNEA to 10⁻¹⁴, and
several hundred times faster than the numpy RNEA for the UR5e mass matrix: we measured
4 µs against 2 ms).

Without MuJoCo, run `verify_all.py` in a venv with only numpy and pytest. It must
report every lab except 08 as verified (27/28), with only the `needs mujoco` tests skipped.
