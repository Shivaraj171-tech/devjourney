# DevJourney: Orbit Orders HQ (working name)

**Learn to code with an AI teammate, and learn to catch its mistakes.**

More and more code is written by AI. The people who thrive will be the ones who can read it, run it, debug it and decide what ships: the human in the loop. DevJourney teaches exactly that, starting from zero.

You join **Orbit Orders**, a small (fictional) food-delivery startup, as a junior developer. Your teammate **Byte** is an AI that writes code fast but not always right. You grow **one real codebase** by closing short tickets (10–20 minutes): bugs, features, code-reading tasks, reviews of AI-written pull requests, and production incidents.

No accounts, no setup: Python runs in your browser (Pyodide), and progress is saved in your browser.

## What's in it

- **Startup HQ**: the home screen. Each season is a floor of the office and each ticket is a room that unlocks once the previous one is done. A phone mock-up of the Orbit Orders app lights up features as you ship them.
- **Ticket workspace**: a story from a teammate, a 2-minute concept lesson (📘 Learn), a VS Code-style editor (Monaco), "Run tests" as CI checks with plain-language error explanations and a 📍 file/line pointer, a "Done when" checklist, staged hints (each costs a little XP), and a short quiz after merging.
- **Ticket types**: `bug`, `feature`, `read` (answer questions about unfamiliar code), `review` (click the lines with problems in a teammate's or AI's pull request; false alarms cost XP) and `incident` (production is down: logs, a countdown and a speed bonus).
- **Practice formats** (`formats.yaml`, small bonus XP, never a penalty): predict the output, break Byte's code, Parsons puzzles and **📋 trace tables**: fill in each watched variable step by step (a row per line that changes one), then "Check" traces the real code in Pyodide with the debugger's tracer and compares cell by cell, highlighting the first wrong row; "👀 Watch it run" replays the real values line by line (+15 XP within 2 checks, +10 after). On 6 tickets: loops, side effects, `while`, string building, nested data, sorting.
- **Byte, the AI teammate** (learn to code with an AI, and learn to catch its mistakes): on some tickets **🤖 Byte suggests** a change as a small diff. *Accept* applies it to your code, *Reject* leaves it out, *Edit it myself* applies it for you to fix. Some suggestions are right, some are subtly wrong, and you only find out by checking (accept a wrong one and the next test run shows you the lesson). On others, the **💬 Ask Byte** tab lets you pick the prompt you'd send and shows what Byte writes back for each. A **🤖 Human-in-the-loop score** on the HQ and leaderboard tracks bugs caught, suggestions trusted correctly, bugs waved through and best prompts picked (+20 XP per catch, +10 per verified good suggestion or best prompt, never a penalty), with two badges (Bug Catcher, Prompt Pro).
- **Game layer**: XP, ranks (Intern → Trusted Intern → Junior Developer, the promotion lands at the end of Month One), a forgiving daily streak (one missed day is bridged), 11 badges, a daily warm-up session (up to 3 quick questions, spaced and mixed: misses come back sooner, see `lib/game/warmups.ts`), a skill tree of everything you've learned, and an office leaderboard against fictional teammates (including Sam, the rival new hire, and Byte, the AI assistant).
- **Fun layer** ([`docs/research/fun-roadmap.md`](docs/research/fun-roadmap.md)): the merge modal counts your XP up, fills the rank bar and celebrates promotions and "flow" combos (clean merges in a row); **#orbit-team**, a chat on the HQ where teammates and Byte react to what you just shipped; rooms merged or unlocked since your last visit animate once; and at the end of each floor Maya writes your **performance review** (`/review/<season>/`). All motion respects `prefers-reduced-motion`.
- **Content** (`content/`, format in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) section 4, every format checked by `scripts/validate_content.py`):

  | Floor | Season | Tickets | Concepts |
  |---|---|---|---|
  | 1 | Your First Week | 10 | strings, numbers, conditionals, loops, lists, dictionaries, reading code, None, functions, mutable shared data |
  | 2 | Week Two: The AI Pair | 5 | code review, side effects, tracebacks, boolean logic, reviewing diffs |
  | 3 | Month One: Going Live | 6 | classes, JSON, writing tests, security, performance, refactoring |
  | 4 | Month Two: Working with Byte | 5 | verifying AI claims, testing AI code first, hallucinated APIs, regressions, giving AI context |
  | 5 | Month Three: Byte's Bad Habits | 6 | try/except done right, while loops, slicing and string methods, nested data, tuples and sorting, scope creep (AI habits: swallowing errors, invented parameters, editing the test, explaining an error wrongly, unrequested extras) |

  Plus 51 daily warm-ups (`content/warmups/`).

- **🐞 Bug Bounty** (`content/seasons/s50-bug-bounty`, `chain: false` without `final`: a side quest): 8 short "mystery bug" tickets on the HQ (off-by-one, None, mutable default, string slicing, dict KeyError, boolean order, tuple unpacking, swallowed exception), each a small separate module. No concept label and no lesson (interleaved practice: working out *which kind* of bug it is is the task), hints allowed. Each opens once the ticket that taught its concept is solved (`requires:` in ticket.yaml); once solved it reveals "This was an off-by-one bug" and links back to that lesson. It never blocks anything: the final exam stays gated on the last on-chain season.

- **🤖 Robotics Lab** (`content/seasons/s40-robotics-lab`, a **side floor**: `chain: false` + `requires: s01-t10` in season.yaml): Orbit Orders' packing arm, **Grabby**, with Rosa the robotics engineer. The whole floor opens once Season 1 is done; inside it, tickets open one after another, each with a lesson, hints, a quiz, Byte (5 of 8 suggestions right, 2 of them partial) and practice formats. It never blocks anything (the final exam stays gated on the last on-chain season). It is its own small codebase (`grabby/`, plain Python, no numpy), which the validator checks evolves ticket to ticket inside the floor:

  | # | Ticket | New concept | Bug |
  |---|---|---|---|
  | 1 | Where is the gripper? | Forward kinematics | degrees passed to `math.cos`, forearm angle not added to the shoulder's |
  | 2 | Reach for the box | Inverse kinematics (law of cosines) | `atan(y / x)` instead of `atan2(y, x)` |
  | 3 | Out of reach | Joint limits and reachability | ring check misses the inner edge, elbow limit never checked |
  | 4 | Smooth moves | Trajectories (joint-space interpolation) | path stops one tick short, steps sized from one joint only |
  | 5 | The shaky shoulder (incident, logs) | PID control | flipped derivative sign: overshoot 56%, oscillation |
  | 6 | Learning to reach | Q-learning | reward pays for hovering near the box, reaching it never ends the episode |
  | 7 | Too good to be true | Logistic regression (and data leaks) | a feature recorded after the grasp leaks the label |
  | 8 | The exploding network | Tiny neural networks (MLP) | unscaled inputs + too high a learning rate: the loss explodes |

  **🔭 Lab viewer**: tests (or learner code) draw with a tiny helper available in the sandbox, `from lab import viz` (`lib/runner/lab.py`, copied next to the runner): `viz.arm(frames, lengths, target=..., ghost=..., limits=...)` animates an n-link planar arm, `viz.chart(name, xs, ys, label=..., hline=..., log=...)` draws line charts (same name: another line), `viz.grid(name, values, path=...)` a heat-map grid such as a Q-table, `viz.points(name, points, labels=...)` a labelled scatter plot. The runner returns what was drawn as JSON next to the test results (rounded, capped: 12 items, 400 frames, 600 points, 200 KB; re-checked in the browser by `lib/lab/viz.ts`), and `components/LabViewer.tsx` shows it under the CI checks after every run: the arm with play/pause/replay and a keyboard slider, the target, the reachable workspace shaded, a cross where the learner's code says the gripper is, and charts with hover values. Every item has a text summary. Runs without `viz` calls are unchanged.

  **🧊 3D view**: `viz.frames3d(name, frames, axes=True, links=True, labels=..., points=..., lines=..., target=..., trail=..., scale=..., title=..., caption=...)` animates 3D coordinate frames: each animation frame is a list of 4x4 homogeneous transforms (nested lists, rows first, world poses), drawn as triads (x red, y green, z blue, and every tip labelled x / y / z so colour is never the only cue) with links between origins, a dashed target pose (a 4x4) or target point, static points and line segments, and a trail. `viz.arm3d(frames, local=True, ...)` is the convenience for arms: link-to-link transforms (T_0_1, T_1_2, ...) composed into a thick arm with triads at the base and the gripper (`axes=True`: a triad on every joint frame, e.g. each DH frame). Matrices are drawn as they are (a drifting quaternion shows as stretched axes); a bottom row that isn't [0, 0, 0, 1] is flagged, not raised. Caps: 12 transforms per frame, 400 frames, 24 lines. `components/Frames3DView.tsx` is a dependency-free canvas renderer (perspective projection from an orbit camera, grid floor at z = 0, painter's sort; maths in `lib/lab/view3d.ts`, unit-tested): drag (mouse or touch) or ←↑→↓ to turn the view, + / − (or the buttons) to zoom, 0 to reset, the same play/replay slider as the planar arm (`components/LabReplay.tsx`), and a text summary per frame (where each named frame is, where the focus frame's axes point, how far and how many degrees from the target). Both also take `ellipsoids=[{center, axes (3x3, columns = principal directions; 3x2 for a flat ellipse), radii, label}]` (e.g. a manipulability / velocity ellipsoid, drawn as a cyan wireframe of latitude and longitude rings with dashed principal axes; the summary gives its radii and condition number, "∞ (flat: singular)" when a radius is 0) and `arrows=[{start, vec, label}]` (velocities, forces, error vectors; fuchsia, with an arrowhead and its length in the summary). Each is a list of dicts (the same in every frame) or one list per frame (they change as the arm moves); caps: 4 ellipsoids and 8 arrows per frame. Log-scale charts keep 4 significant digits (an IK error of 1e-12 stays visible).

- **🦾 Manipulators** (a deep track, one side floor per module, `chain: false` + `lesson: long`; Module 1 has `requires: s01-t10`, each later module `requires` the previous module's last ticket, so the modules open in sequence): the robot-arm maths behind real manipulators, taught **intuition first, then the key maths derived step by step, then implemented** in plain Python (no numpy in the browser: learners write their own tiny `mat` helper in Module 1 and keep it). Lessons are deep (`lesson: long` in season.yaml: up to 700 words of prose, sections **Intuition / The maths / Worked example / Watch out / AI check**, every python block run by the validator and its `# Output:` checked). The 8-module plan:

  | Module | Topic | Status |
  |---|---|---|
  | 1 | Rigid-body motion: rotations, composition order, Euler angles and gimbal lock, axis-angle (Rodrigues), quaternions and slerp, homogeneous transforms, frame chains | ✅ `s41-manipulators-m1` |
  | 2 | Forward kinematics: joints and DOF, composing link transforms, Denavit-Hartenberg tables, the 6-DOF UR5, the spherical wrist, the product of exponentials, DH = PoE | ✅ `s42-manipulators-m2` |
  | 3 | Velocity kinematics: the Jacobian (numeric, analytic, geometric, space and body), singularities, manipulability ellipsoids, statics | ✅ `s43-manipulators-m3` |
  | 4 | Inverse kinematics: counting solutions, analytic (law of cosines, wrist centre), Newton-Raphson on position and full pose, damped least squares, choosing a solution | ✅ `s44-manipulators-m4` |
  | 5 | Trajectories: cubic and quintic polynomials, trapezoidal profiles, joint vs task space | planned |
  | 6 | Dynamics: the Lagrangian 2-link arm, M(q), C(q, q̇), g(q), simulation | planned |
  | 7 | Control: PD + gravity compensation, computed torque, impedance control | planned |
  | 8 | Grasping: contacts, friction cones, force closure | planned |

  **Module 1: Rigid-body motion** (`content/seasons/s41-manipulators-m1`, "🦾 Manipulators · M1" on the HQ via season.yaml `short_title`): Grabby moves up to the 3D shelves, so boxes must arrive the right way round. Its own codebase (`rigid/`), evolving ticket to ticket; every ticket draws in the 3D view; Byte is right on 5 of 8 suggestions (3 partial), 4 with a "why" decision; 10 of 11 tickets have practice formats.

  | # | Ticket | Concept | Bug |
  |---|---|---|---|
  | 1 | Turn the box | 2D rotation matrix: the columns are the turned axes | Byte wrote the turned axes as rows (Rᵀ: turns clockwise) |
  | 2 | Order matters | the `mat` helper and composition order | `matmul` is a TODO; `then(first, second)` multiplies in reading order |
  | 3 | Which way is up? | rotations about x / y / z, RᵀR = I and det = +1 | `rot_y` sign pattern copied from `rot_x`; `is_rotation` accepts mirrors |
  | 4 | Gimbal lock | ZYX Euler angles, extraction, gimbal lock (shown in 3D) | pitch sign; no lock branch (atan2 of rounding noise) |
  | 5 | One axis, one angle | axis-angle, Rodrigues' formula, the 180° case | axis not normalised; 0/0 at 180° |
  | 6 | The drifting wrist | quaternions: half angle, Hamilton product, q v q*, IMU integration | full angle instead of half; no renormalisation (|q| drifts to 1.05) |
  | 7 | Smooth turns | slerp vs (normalised) lerp, the double cover | lerp rushes the middle; no short-way flip |
  | 8 | Undo the move | 4x4 homogeneous transforms and their inverse | Byte's inverse transposes the whole 4x4 |
  | 9 | Through the gripper's eyes | frames of reference, T_a_b naming, chains | box seen with T_base_gripper instead of its inverse |
  | 10 | The wrong tray (incident, logs) | debugging a pose chain | chain multiplied gripper-first; arm walks before it tilts |
  | 11 | Module 1 concept check (read) | the module on one page | 9 mixed conceptual and numeric questions, predict and Parsons |

  **Module 2: Forward kinematics** (`content/seasons/s42-manipulators-m2`, "🦾 Manipulators · M2" on the HQ): Orbit Orders buys a real six-joint arm, Grabby-6, and the team builds its forward kinematics from a single joint up to the full 6-DOF UR5 in 3D. A **sequential side floor**: `requires: s41-t11`, so the HQ shows "🔒 opens after Manipulators · M1" until Module 1 is done. Its codebase starts from Module 1's final `rigid/` and adds `kin/`; every code ticket draws the arm with `viz.arm3d(..., axes=True)`, a triad on every joint frame. The UR5 uses Universal Robots' nominal, uncalibrated DH parameters (the same values and sources as `labs/manipulators/toolbox/robots.py`), checked against the documented home pose and against the numpy laptop lab at random poses. Byte is right on 5 of 8 suggestions (2 partial), 4 with a "why" decision; 10 of 11 tickets have practice formats.

  | # | Ticket | Concept | Bug |
  |---|---|---|---|
  | 1 | What is a joint? | revolute vs prismatic, DOF and Grübler's count, why 6 DOF | the lift (prismatic) turns instead of sliding; Grübler forgets the ground (a 6-joint arm "has 12 DOF") |
  | 2 | Two links, one chain | FK by composing link transforms (a 2-link arm in 3D) | `frames_in_base` returns the link transforms un-chained: the elbow is right, the tip isn't |
  | 3 | Three joints, one order | FK of a 3-DOF RRR arm (yaw, shoulder, elbow) | Byte multiplies the chain wrist-first: right at home, wrong everywhere else |
  | 4 | Four numbers per joint | the DH convention: θ, d, a, α and reading a table | a row unpacked as (a, α, offset, d): the 0.20 m pedestal becomes a 0.20 rad turn |
  | 5 | Your own DH table | deriving a DH table from frames | Byte's table: no 90° twist at the base, the upper arm's length in the d column |
  | 6 | Six joints: the UR5 | 6-DOF FK from a datasheet table (six frames in 3D) | a2, a3 typed positive: the home pose is mirrored |
  | 7 | The wrist centre | spherical wrist, wrist centre, position/orientation decoupling | z6 taken from the third row instead of the third column |
  | 8 | Screws and exponentials | product of exponentials: screw axes, e^([S]θ) in pure Python | the revolute twist's translation is v θ (a slide) instead of G(θ) v |
  | 9 | Two roads, one pose | DH and PoE agree (a proof, then random poses) | joint i's screw taken from frame i instead of frame i-1 |
  | 10 | The missing ninety (incident, logs) | joint offsets and tool frames | the elbow's 90° θ offset "tidied" away; the gripper returns the flange, not the fingertips |
  | 11 | Module 2 concept check (read) | the module on one page | 9 mixed questions, predict and Parsons |

  **Module 3: Velocity kinematics** (`content/seasons/s43-manipulators-m3`, "🦾 Manipulators · M3" on the HQ, `requires: s42-t11`): Grabby-6 has to match a conveyor's speed, so the team builds its Jacobian: how joint speeds become gripper speeds, where the arm loses a direction, and the forces the same matrix sends back to the motors. Its codebase starts from Module 2's final `kin/` + `rigid/` and adds `vel/` (plain Python: the learners' own Gaussian elimination for det, rank and solve, Jacobi eigenvalues for the ellipsoid). Conventions match the laptop labs 09-10: geometric Jacobian [Jv; Jw], twists (w, v), J_b = Ad(T_sb⁻¹) J_s, the UR5's nominal DH and closed-form det J. Every code ticket draws in 3D with velocity arrows or the manipulability ellipsoid. Byte is right on 5 of 8 suggestions (2 partial), 4 with a "why" decision; all 10 tickets have practice formats.

  | # | Ticket | Concept | Bug |
  |---|---|---|---|
  | 1 | How fast is the gripper? | velocity kinematics by central differences (2-link) | `step()` nudges the caller's list in place: a forward difference over 2h, half the speed |
  | 2 | The two-link Jacobian | the analytic Jacobian, det J = l1 l2 sin q2 (velocity ellipse in 3D) | sin(q2) where the forearm's angle is q1 + q2: right only at q1 = 0 |
  | 3 | One column per joint | geometric Jacobian z(i-1) × (p_e - p(i-1)), z(i-1) | joint i's axis taken from frame i: only the base column is wrong |
  | 4 | Who checks the checker? | the UR5's 6x6 Jacobian vs finite differences (flange v and w arrows) | the checker's w = vee(Rᵀ Ṙ) is the flange-frame spin, not the base frame's |
  | 5 | Two frames, one motion | space and body Jacobians, the adjoint | a (v, w) adjoint ([p]R top-right) in a (w, v) codebase |
  | 6 | Where the arm gets stuck | singularities: rank, det, the stretched elbow and the wrist flip in 3D | no sign flip on a row swap; the wrist test reads q4 instead of q5 |
  | 7 | The ellipsoid goes flat | manipulability (Yoshikawa) and the velocity ellipsoid, flattening in 3D | eigenvalues used as radii; w = det(J Jᵀ) without the root |
  | 8 | Hold that box | statics τ = Jᵀ F | J F instead of Jᵀ F: "the shoulder holds nothing" straight out |
  | 9 | The frozen wrist (incident, logs) | condition number monitoring | κ squared ("faster, no sqrt"): the arm freezes 28° from the flip |
  | 10 | Module 3 concept check (read) | the module on one page | 9 mixed questions, predict and Parsons |

  **Module 4: Inverse kinematics** (`content/seasons/s44-manipulators-m4`, "🦾 Manipulators · M4", `requires: s43-t10`): the planner knows where the box is; which joint angles? Starts from Module 3's final code and adds `ik/`. Newton's iterates are drawn one per few frames with the error arrow and a log-scale error chart; damped steps at the edge of reach show the flattening ellipsoid. Conventions match the laptop labs 12-15: body twist error V_b = log(T_sb⁻¹ T_sd) with J_b, DLS dq = Jᵀ (J Jᵀ + λ² I)⁻¹ e, the closest solution within limits. Byte is right on 5 of 8 suggestions (2 partial), 4 with a "why" decision; all 10 tickets have practice formats.

  | # | Ticket | Concept | Bug |
  |---|---|---|---|
  | 1 | Forward kinematics, backwards | how many IK solutions (the reachable ring; brute force in 3D) | no inner radius; the edges counted as 2 |
  | 2 | The law of cosines | analytic two-link IK, elbow up / down, atan2 | the shoulder correction uses abs(s2); `abs(c2) > 1` rejects a box at full reach |
  | 3 | Three joints, backwards | base angle + planar arm, four solutions | the in-plane height measured from the floor, not the shoulder |
  | 4 | Find the wrist first | wrist-centre decoupling for a spherical wrist | the wrist assumed D6 above the flange: right only for picks from above |
  | 5 | Newton, step by step | Newton-Raphson on position, quadratic convergence (frame by frame in 3D) | e = p(q) - target: every step walks away |
  | 6 | Position and orientation | full-pose Newton on the UR5 with the body twist error | log_SE3 returns p instead of G⁻¹(θ) p θ (and Newton still converges) |
  | 7 | Damping the explosion | damped least squares | plain Newton (`solve(J, e)`): 170 rad steps 5 cm out of reach |
  | 8 | Which of the four? | joint limits, the closest solution | a signed sum as the distance; limits checked at one end only |
  | 9 | The box at the edge of reach (boss incident, logs) | robust IK: damped and clamped steps | damping and the step clamp "simplified" away: the elbow thrashes, joint 3 jumps 24 rad |
  | 10 | Module 4 concept check (read) | the module on one page | 9 mixed questions, predict and Parsons |

  **Authoring the next modules**: copy the Module 1 floor's shape: a new `content/seasons/s45-manipulators-m5/season.yaml` with `chain: false`, `requires: s44-t10` (the previous module's last ticket: a side floor's `requires` may name another side floor's ticket; the validator checks it exists, isn't the floor's own and that the floors' requires never loop, and the HQ says "🔒 opens after Manipulators · M4"), `lesson: long`, `icon: "🦾"` and a `short_title`; it appears on the HQ and opens with no code change. Start its codebase from the previous module's final package (copy its last ticket's starter into the new t01 starter; the evolving-codebase check then runs inside the floor). One concept per ticket; each concept.md has the five sections and a worked example whose `# Output:` the validator runs; tests use tolerances and helpful messages; draw with `viz.arm3d` (link-to-link transforms per pose, which is exactly forward kinematics) or `viz.frames3d`, and `viz.chart` for joint trajectories, torques and errors. Add the concept slugs to `lib/content/concepts.ts`, a spec like `e2e/manipulators-m1.spec.ts`, and a row to the table above.

- **Final exam: Byte's Week Alone** (`content/seasons/s99-final`, `chain: false` + `final: true` in season.yaml): an unseen module (the loyalty points service), 3 tickets (review Byte's PR with 3 mistakes, fix a bug from the logs, write tests that catch Byte's 4 earlier versions). Exam mode: no hints, lesson, Byte or concept label; normal CI checks. It opens when the nearest on-chain season before it is complete (`lib/content/order.ts`), so new seasons slot in before it with no code change.
- **Skills check** (`/skills-check/`, `content/assessment/skills-check.yaml`): 12 questions (predict the output, which input catches the bug, spot the bug line, pick the right one of Byte's 3 answers), every answer verified by running it. Taken as a skippable baseline after onboarding and again when the final exam opens; "Baseline 5/12 → Final 11/12" shows on the HQ, the performance review and as a shareable line. Merging the 3 exam tickets and taking the final check unlocks the printable **Human in the loop: verified** certificate (`/certificate/`).
- **🧭 My coding profile** (`/profile/`, from the Today card and the top bar): personalization from what the learner's code actually does, all in the browser (no AI, no server). Each test run adds a small run log entry per ticket (`lib/game/runLog.ts`: passed/total, failing check names, error kinds such as KeyError or timeout, a code hash to tell whether the code changed, Step through used; never the code, newest 20). `lib/game/profile.ts` turns that plus hints, quiz first picks, warm-ups, practice formats and Byte calls into a mastery estimate per concept (recency-weighted, every line with its evidence: "3 KeyErrors on #6") and habits (trusts Byte quickly, edge cases, re-runs without changes, uses the debugger, hints, reads errors). It feeds the warm-up scheduler ("Made for you"), "Recommended for you" on the Bug Bounty board, one focus line on the Today card, a nudge on Byte's card, and in-ticket help after 3 failed runs on the same check (`lib/game/help.ts`). Never a penalty.
- **Settings & backup** (`/settings/`, ⚙️ in the top bar): progress lives only in the browser (Safari can clear it after 7 days without a visit), so learners can download a backup file or copy a **backup code** (`DJB1.z.…`, compressed, versioned, CRC-32 checked), restore either one after a preview ("26 tickets merged, 1840 XP, saved 3 days ago"), and reset with a typed confirmation. The HQ shows a gentle reminder after 7+ days without a backup. Logic: `lib/progress/backup.ts`.
- **Teacher view** ([`/teacher/`](https://shivaraj171-tech.github.io/devjourney/teacher/), not in the main nav): no accounts. Students type the teacher's class code on `/settings/` and send a **class report code** (`DJR1.…`: name, class code, tickets merged per floor, XP, Byte stats, skills check scores, last active day; no code or answers). The teacher pastes the codes (or a text file of them) and gets a sortable table, per-student cards, class averages (tickets per floor, Byte catch rate, skills check gain) and a CSV download. Everything is decoded and stored only in the teacher's browser. Logic: `lib/teacher/`.
- **Research**: competitor analysis in [`docs/research/competitors.md`](docs/research/competitors.md).

## Run it

Requires Node 20+ and Python 3 (Python is only for the content tools).

```bash
npm install
```
```bash
npm run dev
```
Then open http://localhost:3000.

Production build (fully static site in `out/`, deployable to any static host):
```bash
npm run build
```
```bash
npm start
```
That serves `out/` at http://localhost:3000.

## Tests and checks

| Command | What it checks |
|---|---|
| `npm run validate-content` | Every ticket: starter fails its tests, solution passes, metadata/hints/quiz/lesson valid, codebase evolves ticket to ticket (needs `pip install pyyaml`) |
| `python3 -m unittest discover -s scripts/tests` | Tests for the Python test runner and the content validator |
| `npm run test:unit` | Game rules, error explanations, checklist parsing |
| `npm run e2e` | Playwright end-to-end: plays every ticket of every season in a real browser (Python in Pyodide) |
| `npm run lint` | ESLint |

## How it works

- `content/`: seasons and tickets (story, lesson, starter code, tests, reference solution, hints, quiz). Read at build time; the reference solution is never sent to the browser.
- `lib/runner/test_runner.py`: a tiny stdlib-only test runner (plain `assert` tests, no pytest). Used by the validator **and** inside the browser.
- `public/runner-worker.js`: web worker that loads Pyodide and runs a ticket's tests on the learner's code. Infinite loops are stopped by a timeout that restarts the worker.
- `lib/runner/tracer.py`: the 🐞 Step through debugger. Re-runs one check with `sys.settrace` in the worker and records each step in the learner's code (line, variables, call stack, printed output; max 300 steps). `lib/debugger/timeline.ts` turns steps into captions and changed-variable highlights; `components/DebuggerPanel.tsx` replays them with the current line highlighted in the editor.
- `scripts/copy-assets.mjs`: copies Pyodide and Monaco from `node_modules` into `public/` (self-hosted, no CDN). Runs automatically before `dev` and `build`.
- `scripts/sw.template.js` → `public/sw.js` (generated by `copy-assets.mjs`, production builds only): a service worker that caches Pyodide, Monaco and the runner on the device, so second visits are fast and opened tickets work offline. Measurements in [`docs/research/mobile-performance.md`](docs/research/mobile-performance.md).
- `lib/progress/store.ts`: progress in `localStorage`. `lib/game/rules.ts`: XP, ranks, streaks, badges, leaderboard.
