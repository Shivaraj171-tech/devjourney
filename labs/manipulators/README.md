# Robot manipulator labs: laptop edition (Modules 1–3)

Eleven hands-on labs that take you from rotation matrices to a UR5 that draws a
straight line in a physics simulator. Each lab follows the same rhythm:
**intuition → key maths derived step by step → you implement it → tests check it**
(and for Modules 2–3, a real simulator checks it too).

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
python labs/manipulators/tools/verify_all.py   # sanity check: should end "11/11 labs verified."
python -m labs.manipulators                    # the lab menu
```

`requirements.txt` pins the versions we installed and ran: numpy 2.5.5, pytest 9.2.0,
mujoco 4.0.1 and matplotlib 3.11.2. `.venv/` is already in `.gitignore`.

- **MuJoCo is optional but recommended.** Without it, simulator tests are *skipped*
  (never silently passed). Lab 08 can't be completed, and the MuJoCo parts of labs
  04, 09 and 11 don't run. Everything else works with numpy alone.
- **matplotlib is optional.** It's only used by `visual`.
- Everything runs **headless**. No window is opened, and no GPU or OpenGL is needed.
  To look at a model, `python -m mujoco.viewer --mjcf=file.xml` opens the
  interactive viewer if you have a display (see lab 08).

## The labs

| # | Lab | Module | XP | Uses MuJoCo |
|---|---|---|---|---|
| 01 | Rotation matrices and SO(3) | 1 Rigid-body motion | 100 | |
| 02 | Euler ZYX angles and gimbal lock | 1 | 100 | |
| 03 | Axis-angle, Rodrigues, exp/log on SO(3) | 1 | 120 | |
| 04 | Quaternions and slerp | 1 | 120 | cross-check with `mju_mulQuat` |
| 05 | Homogeneous transforms and frame chains | 1 | 120 | |
| 06 | DH forward kinematics: 3-DOF arm + UR5 | 2 Forward kinematics | 150 | |
| 07 | Product of exponentials; DH == PoE | 2 | 180 | |
| 08 | Write an MJCF model, validate FK in MuJoCo | 2 | 180 | **required** |
| 09 | Space, body and geometric Jacobians | 3 Velocity kinematics | 180 | cross-check with `mj_jacSite` |
| 10 | Singularities and manipulability ellipsoids | 3 | 150 | |
| 11 | Resolved-rate control: straight line in sim | 3 | 200 | MuJoCo multibody + numpy robot |

The UR5 DH parameters come from Universal Robots' published table. The source URL
is in `toolbox/robots.py`. The 3-DOF arm uses our own stated dimensions.

Each `labXX_*/` folder contains:

- `README.md`: intuition, derivation and the task
- `starter.py`: **your file**, with `TODO`s that raise `NotImplementedError`
- `tests/`: pytest tests that are deterministic (fixed seeds), compare with
  tolerances and fail with a message that says what's wrong
- `hints.json`: three staged hints
- `solution.py`: the reference solution. The menu never shows it (see `--reveal`).
- `visual.py` in labs 02, 04, 06, 10 and 11: saves a PNG made with *your* code

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

- **XP.** The first passing `check` awards the lab's XP (100–200).
- **Hints** cost 5, 10 and then 20 XP for stages 1, 2 and 3. Re-reading a hint you
  already bought is free. Hints are free once you've passed the lab.
- **Reveal** unlocks after 3 failed checks. If you reveal before passing, the lab
  still counts as complete when you pass it, but it earns 0 XP.
- **Ranks**: Novice → Apprentice (300) → Technician (700) → Engineer (1100) →
  Researcher (1500).
- **Badges**: First Light, One Shot (pass on the first check), Purist (3 labs with no
  hints), Frame Wrangler, Chain Forger and Jacobian Whisperer (one per module), Sim
  Validated (lab 08 with MuJoCo running), Straight Shooter (lab 11 in MuJoCo) and
  Manipulator Graduate.
- Progress is stored in `~/.devjourney-labs/manipulators-progress.json` (override with
  `DEVJOURNEY_LABS_HOME`). Delete the file, or run `reset`, to start over.

You can also run the tests without the CLI:
`pytest labs/manipulators/lab03_axis_angle` tests your starter, and
`LAB_TARGET=solution pytest …` tests the reference.

## How this pairs with the browser track

The web app's Modules 1–3 teach the same ideas in the browser (Pyodide, no
install). Each lab README names its "browser twin". A good loop:

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

The MuJoCo robot for lab 11 lives in `toolbox/sim.py`. It's built from the lab 08
MJCF and adds position servos, joint damping, armature and gravity compensation.
