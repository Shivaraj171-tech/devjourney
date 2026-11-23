# Lab 25 · Impedance control

Module 7 (control) · 220 XP · browser twin: Module 7 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

A position controller tries to be *infinitely* stiff: any deviation is an error to
crush. That's exactly wrong when the robot touches something. Press a stiff
position-controlled arm into a table and it will push as hard as its motors
allow, damaging the table, the part or itself. Humans do the opposite: we choose how
*soft* to be. That's **impedance control** (Hogan, 1985). Instead of a position, we
command a **relationship between force and motion**: "behave like a spring of
stiffness K and a damper D tied to the point x₀."

The law is lab 24's Jacobian transpose, read differently: τ = Jᵀ(K(x₀ − x) − Dẋ) + g(q).
In free space the hand goes to x₀. Push it with a force f and it gives way
by exactly K⁻¹f, as a spring should. Command x₀ *inside* a table and the hand
stops on the surface, pressing with force K·(depth of x₀). The stiffness and the
target together *set* the contact force. We'll push the simulated hand with MuJoCo's
`xfrc_applied`, measure K back from the deflections, and then press on a table.

## Key maths, step by step

**1. The law.** With the task position x (3-vector), Jv = J and ẋ = J q̇:

    τ = Jᵀ ( K (x₀ − x) − D J q̇ ) + g(q)

K and D can be full 3×3 matrices: a hand that's stiff vertically but soft
sideways, say. (`as_matrix` turns scalars and diagonals into matrices.)

**2. Statics: what an outsider feels.** Let an external force f push the hand. The
dynamics gain + Jᵀ f (virtual work, as in lab 24). At rest (q̇ = q̈ = 0) the
gravity terms cancel and

    Jᵀ ( K (x₀ − x) + f ) = 0   ⇒   K (x − x₀) = f       (J square and invertible)

so the hand deflects **x − x₀ = K⁻¹ f**. The controller makes the end effector a
spring of exactly stiffness K. (With a redundant arm Jᵀ has a null space, but
the same holds for the task-space part.) The damping D only shapes the
transient. Lab 22's Lyapunov argument shows it settles.

**3. Pushing in MuJoCo: `xfrc_applied`.** `data.xfrc_applied[body]` is a 6-vector
added to that body every step, as **[force; torque] in world axes, applied at
the body's centre of mass** (`data.xipos[body]`). We checked both facts in MuJoCo
4.0.1: a pure +z force on a free body with an off-centre COM produced linear
acceleration only, with no spin. Note the order: force *first*, the opposite of our (m, f)
wrench convention. To push at the hand (the `ee` site, `data.site_xpos`) instead of
the COM, move the force there with the usual moment arm:

    xfrc = [ f ;  (p_site − p_com) × f ]

Forget the torque and you're pushing on a different point: we measured 7.3 mm instead
of 10 mm of deflection. (`mujoco.mj_applyFT(model, data, force, torque, point, body,
data.qfrc_applied)` does the same move for you, into joint space. The two agree to
10⁻¹¹ m here.)

**4. Measure the stiffness.** Each push experiment gives a pair (f_k, d_k) with
f_k = K d_k. Stack them as columns, F = K D, and solve by least squares
(`np.linalg.lstsq(Dᵀ, Fᵀ)` gives Kᵀ). Three independent pushes determine all nine
entries.

**5. Contact.** `toolbox.models.arm3_table_mjcf` gives the 3-DOF arm a ball fingertip
(geom `tip`, radius r) and a table (geom `table`, top at z_t), with contacts on. After
`mj_step`, `data.contact[:data.ncon]` lists the active contacts. Each has `geom1`,
`geom2` and a contact `frame` whose **first row is the normal**, pointing from geom1 to
geom2. `mujoco.mj_contactForce(model, data, i, out6)` writes that contact's force in
the contact frame, normal component first, as the force on geom2 (we checked: a 2 kg box on a
plane gives 4 × 4.905 N = its weight). Sum the normal components over the pairs you care
about (`contact_normal_force`).

Now command x₀ a depth δ *below* the point where the ball first touches (centre
height z_t + r). At rest the table's force balances the spring:

    F_n = [K (x₀ − x)]_z ≈ K_z δ

with x the actual (barely penetrating) hand position. MuJoCo's contacts are soft,
so the ball sinks in by a fraction of a millimetre. Using the measured x makes the
prediction exact. The hand doesn't bounce: the damper D absorbs the impact, and
afterwards the force is as steady as the spring.

## What we measured

3-DOF arm in MuJoCo (2 ms steps, RNEA gravity), K = diag(500, 300, 800) N/m,
D = diag(40, 30, 50) N s/m, pushes of 5 N along x, y and −z at the hand: deflections
10.000, 16.667 and −6.250 mm (exactly K⁻¹f), and the estimated K equals diag(500, 300, 800)
to 0.01 N/m. A combined (3, −3, 4) N push lands on (6, −10, 5) mm.

Table contact (K_z = 500 N/m, D_z = 45 N s/m, x₀ moved down over 1 s by a quintic to
2 cm below the touch point, 1 ms steps): first contact at 0.82 s, an impact peak of 30 N,
then a steady **9.982 N ± 0.0001 N** against the predicted 9.985 N. The ball sank 0.03 mm into the
table.

## Task

Implement `as_matrix`, `impedance_torque`, `predicted_deflection`, `xfrc_for_point_force`,
`estimate_stiffness`, `contact_normal_force`.

    python -m labs.manipulators check lab25
    python -m labs.manipulators visual lab25   # contact force while pressing on the table
