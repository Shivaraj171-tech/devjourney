# Robot manipulator labs: laptop edition (Modules 1–6)

Twenty hands-on labs that take you from rotation matrices, through a UR5 that draws a
straight line in a physics simulator, to inverse kinematics, trajectories and a
rigid-body simulator of your own that matches MuJoCo to round-off. Each lab follows
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
python labs/manipulators/tools/verify_all.py   # sanity check: should end "20/20 labs verified."
python -m labs.manipulators                    # the lab menu
```

`requirements.txt` pins the versions we installed and ran: numpy 2.5.5, pytest 9.2.0,
mujoco 4.0.1 and matplotlib 3.11.2. `.venv/` is already in `.gitignore`.

- **MuJoCo is optional but recommended.** Without it, simulator tests are *skipped*
  (never silently passed). Lab 08 can't be completed, and the MuJoCo parts of labs
  04, 09, 11, 15, 17, 18, 19 and 20 don't run. Everything else works with numpy alone
  (`verify_all` then reports "19/20 labs verified, 1 skipped").
- **matplotlib is optional.** It's only used by `visual`.
- Everything runs **headless**. No window is opened, and no GPU or OpenGL is needed.
  To look at a model, `python -m mujoco.viewer --mjcf=file.xml` opens the
  interactive viewer if you have a display (see lab 08).

## The labs

Times are rough estimates for a first pass (reading, deriving, coding, debugging);
the tests themselves run in 0.2–2 s per lab.

| # | Lab | Module | XP | Time | Uses MuJoCo |
|---|---|---|---|---|---|
| 01 | Rotation matrices and SO(3) | 1 Rigid-body motion | 100 | 1 h | |
| 02 | Euler ZYX angles and gimbal lock | 1 | 100 | 1 h | |
| 03 | Axis-angle, Rodrigues, exp/log on SO(3) | 1 | 120 | 1.5 h | |
| 04 | Quaternions and slerp | 1 | 120 | 1.5 h | cross-check with `mju_mulQuat` |
| 05 | Homogeneous transforms and frame chains | 1 | 120 | 1 h | |
| 06 | DH forward kinematics: 3-DOF arm + UR5 | 2 Forward kinematics | 150 | 1.5 h | |
| 07 | Product of exponentials; DH == PoE | 2 | 180 | 2 h | |
| 08 | Write an MJCF model, validate FK in MuJoCo | 2 | 180 | 2 h | **required** |
| 09 | Space, body and geometric Jacobians | 3 Velocity kinematics | 180 | 2 h | cross-check with `mj_jacSite` |
| 10 | Singularities and manipulability ellipsoids | 3 | 150 | 1.5 h | |
| 11 | Resolved-rate control: straight line in sim | 3 | 200 | 2 h | MuJoCo multibody + numpy robot |
| 12 | Analytic IK of the 3-DOF arm: 4 solutions, elbow up/down | 4 Inverse kinematics | 150 | 1.5 h | |
| 13 | Numerical IK: Newton–Raphson on the body twist | 4 | 180 | 1.5 h | |
| 14 | Damped least squares / Levenberg–Marquardt, limits, choosing | 4 | 200 | 2 h | |
| 15 | UR5 IK campaign: poses → joints, verified 3 ways | 4 | 220 | 2 h | MJCF kinematics + servoed arm |
| 16 | Cubic, quintic and trapezoidal time scaling | 5 Trajectories | 150 | 1.5 h | |
| 17 | Joint-space vs Cartesian trajectories on the UR5 | 5 | 220 | 2.5 h | tracked by the servoed arm |
| 18 | Lagrangian dynamics of the 2-link arm: M, C, g | 6 Dynamics | 200 | 2.5 h | `mj_fullM`, `qfrc_bias`, energy |
| 19 | Recursive Newton–Euler inverse dynamics (3-DOF, UR5) | 6 | 220 | 2.5 h | `mj_inverse` |
| 20 | Forward dynamics: Euler, semi-implicit, RK4, energy | 6 | 250 | 2.5 h | MuJoCo `RK4`/`Euler` trajectories |

Module map: **1** rigid-body motion (01–05) → **2** forward kinematics (06–08) →
**3** velocity kinematics (09–11) → **4** inverse kinematics (12–15) →
**5** trajectories (16–17, which use lab 14's IK) → **6** dynamics (18–20, which reuse
labs 07 and 09: screws, adjoints, Jacobians). Modules 4 and 6 can be done in either
order once Module 3 is done.

The UR5 DH parameters come from Universal Robots' published table. The source URL
is in `toolbox/robots.py`. The 3-DOF arm uses our own stated dimensions. For the
dynamics labs, the 3-DOF arm's and the 2-link arm's masses and inertias are our own.
The UR5's masses and centres of mass are as we recall them from the same UR article,
**not re-verified** (the site wasn't reachable), and its inertia tensors are our own
cylinder approximations. MuJoCo gets the same numbers (`toolbox/models.py`), so
every dynamics check compares like with like.

Each `labXX_*/` folder contains:

- `README.md`: intuition, derivation and the task
- `starter.py`: **your file**, with `TODO`s that raise `NotImplementedError`
- `tests/`: pytest tests that are deterministic (fixed seeds), compare with
  tolerances and fail with a message that says what's wrong
- `hints.json`: three staged hints
- `solution.py`: the reference solution. The menu never shows it (see `--reveal`).
- `visual.py` in labs 02, 04, 06, 10, 11, 12, 13, 16, 17 and 20: saves a PNG made with *your* code

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

- **XP.** The first passing `check` awards the lab's XP (100–250; 3390 in all).
- **Hints** cost 5, 10 and then 20 XP for stages 1, 2 and 3. Re-reading a hint you
  already bought is free. Hints are free once you've passed the lab.
- **Reveal** unlocks after 3 failed checks. If you reveal before passing, the lab
  still counts as complete when you pass it, but it earns 0 XP.
- **Ranks**: Novice → Apprentice (300) → Technician (700) → Engineer (1100) →
  Researcher (1500) → Senior Researcher (2200) → Principal Investigator (3000).
- **Badges**: First Light, One Shot (pass on the first check), Purist (3 labs with no
  hints); one per module: Frame Wrangler, Chain Forger, Jacobian Whisperer, Pose
  Hunter, Smooth Operator and Equations of Motion; with MuJoCo actually running:
  Sim Validated (lab 08), Straight Shooter (lab 11), Torque Matched (lab 19) and
  Digital Twin (lab 20); and Manipulator Graduate (all 20 labs).
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

Without MuJoCo, run `verify_all.py` in a venv with only numpy and pytest. It must
report every lab except 08 as verified, with only the `needs mujoco` tests skipped.
