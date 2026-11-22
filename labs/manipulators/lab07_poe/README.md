# Lab 07 · Product of exponentials (PoE): screws, exp on SE(3), DH == PoE

Module 2 · 180 XP · browser twin: Module 2 of the web track

## Intuition

DH asks you to place a frame on every link by strict rules. The PoE formula
(Brockett 1984; *Modern Robotics* ch. 4) needs only **two things**: the
gripper's pose M when all joints are at zero, and, for each joint, the line in
space it spins about (its **screw axis**), also measured at zero. Then:

> to get the pose at q, spin the whole arm beyond joint n about its axis by qₙ,
> then everything beyond joint n−1 by qₙ₋₁, …, down to joint 1.

No intermediate frames, no conventions to mix up, and it generalises directly to
the Jacobian (lab 09). The price is one new tool: the exponential of a **twist**.

## Key maths, step by step

**1. Twists.** A rigid body's velocity is a twist V = (ω, v): angular velocity
ω and the linear velocity v of the (possibly imaginary) body point at the
origin. Its 4x4 form is

    [V] = [[ [ω], v ],
           [  0 , 0 ]]        so that  Ṫ T⁻¹ = [V_s]   (compare Ṙ Rᵀ = [ω_s] in lab 02)

**2. Screw axis of a revolute joint.** Unit axis ω̂ through a point q. A point p
on the spinning body moves with ṗ = ω̂ × (p − q) = ω̂ × p + (−ω̂ × q).
Matching ṗ = [ω] p + v gives

    S = (ω̂, −ω̂ × q)          (prismatic joint: S = (0, v̂))

**3. exp on SE(3), derived.** Spinning about S for "time" θ solves Ṫ = [S] T, so
T(θ) = e^{[S]θ}. Series, with ‖ω̂‖ = 1:
[S]ⁿ = [[ [ω̂]ⁿ, [ω̂]ⁿ⁻¹ v ], [0, 0]]. The rotation block sums to Rodrigues (lab 03).
The translation block is (Σ [ω̂]ⁿ⁻¹ θⁿ/n!) v; use [ω̂]³ = −[ω̂] once more:

    G(θ) = Iθ + (1 − cos θ)[ω̂] + (θ − sin θ)[ω̂]²
    e^{[S]θ} = [[ e^{[ω̂]θ}, G(θ) v ], [0, 1]]

If ω = 0 (pure translation) the series stops after one term: [[I, vθ], [0, 1]].
If ‖ω‖ ≠ 1, divide S by ‖ω‖ and multiply θ by it.

**4. log on SE(3).** Get ω̂θ from log_so3(R) (lab 03); invert step 3's
translation, p = G(θ) v̂, to get v̂ = G(θ)⁻¹ p with

    G(θ)⁻¹ = I/θ − [ω̂]/2 + (1/θ − ½ cot(θ/2)) [ω̂]²

(check it by multiplying with G(θ) and using [ω̂]³ = −[ω̂]). Return (ω̂θ, vθ). Pure
translation (θ ≈ 0): log T = (0, p). You'll use this in lab 11 to measure pose error.

**5. The PoE formula.** Freeze joints 1…n−1 at 0 and move joint n: the gripper
spins about Sₙ, so T = e^{[Sₙ]qₙ} M. Now move joint n−1: it carries joint n's axis
*and* the gripper, both of which are rigidly beyond it, so

    T(q) = e^{[S₁]q₁} e^{[S₂]q₂} … e^{[Sₙ]qₙ} M          (space form)

Every Sᵢ is written in the base frame **at q = 0**: that's the whole trick.

**6. Body form.** Push M through to the left using M e^{[B]θ} M⁻¹ = e^{[Ad_M B]θ}:

    T(q) = M e^{[B₁]q₁} … e^{[Bₙ]qₙ},   Bᵢ = Ad_{M⁻¹} Sᵢ,   Ad_T = [[R, 0], [[p]R, R]]

**7. DH == PoE.** Both describe the same arm, so they must agree at every q. To get
the PoE data from a DH table: compute the DH frames at q = 0; joint i spins about
z_{i−1} through o_{i−1}, so Sᵢ = (z_{i−1}, −z_{i−1} × o_{i−1}), and M = T_0n(0). The
tests check this for the UR5 and your 3-DOF arm at random configurations.

## Task

Implement `twist_to_matrix`, `matrix_to_twist`, `adjoint`, `exp_se3`, `log_se3`,
`revolute_screw`, `fk_space`, `fk_body`, `screws_from_dh`, `body_screws`.

    python -m labs.manipulators check lab07
