# Lab 12 · Analytic inverse kinematics of the 3-DOF arm

Module 4 (inverse kinematics) · 150 XP · browser twin: Module 4 of the web track (planned)

## Intuition

Forward kinematics (labs 06–07) answers *where is the hand, given the joints?*
Inverse kinematics (IK) asks the question a robot actually gets: *here is
where the hand must go, so what should the joints be?* FK is a function: one q
gives one pose. IK is not. A target can have **several** solutions (raise
your elbow or drop it, the hand stays put), **infinitely many** (a target
on the base axis: spin the base, nothing moves), or **none** (out of reach).

For arms with simple geometry you can solve IK with trigonometry, in closed
form. It's exact and fast (microseconds), and it gives you *every* solution at
once, so you get to choose between them. Industrial controllers use closed
forms whenever the arm allows. Our 3-DOF arm (lab 06: base yaw, shoulder pitch,
elbow pitch; d₁ = 0.30, a₂ = 0.40, a₃ = 0.30) is the textbook case. With 3
joints it controls the tip **position** (3 numbers), not its orientation.

## Key maths, step by step

**1. Split the problem.** From lab 06 the tip is

    p = (r cos q₁,  r sin q₁,  d₁ + a₂ sin q₂ + a₃ sin(q₂+q₃)),
    r = a₂ cos q₂ + a₃ cos(q₂+q₃)

Joint 1 only turns the arm's vertical plane. Inside that plane, joints 2 and 3
form a planar 2R arm whose tip sits at (r, s) with s = z − d₁. So the problem
splits into **one angle for the plane** plus **a 2R problem in the plane**.

**2. The base angle: two choices.** Let ρ = √(x² + y²) be the target's
horizontal distance from the base axis. The plane must contain the target:

- **front**: q₁ = atan2(y, x), and the in-plane reach is r = +ρ
- **back**: q₁ = atan2(y, x) + π, and r = −ρ (the arm faces away and reaches
  back over its own head)

If ρ = 0 (the target is on the base axis) q₁ is arbitrary, which gives
infinitely many solutions. We pick q₁ = 0. Numerical IK (lab 13) has a hard time
here too, because J loses rank: this is the shoulder singularity of lab 10.

**3. The elbow angle from the law of cosines.** Shoulder, elbow and tip form a
triangle with sides a₂, a₃ and the shoulder–tip distance D, D² = r² + s².
Expand r² + s² using the two FK lines (cos² + sin² = 1 and the
angle-difference formula):

    r² + s² = a₂² + a₃² + 2 a₂ a₃ cos q₃
    ⇒  cos q₃ = (r² + s² − a₂² − a₃²) / (2 a₂ a₃)

- |cos q₃| > 1 ⇒ **unreachable** (D > a₂ + a₃, or D < |a₂ − a₃| in the hole
  near the shoulder).
- Otherwise there are two answers, q₃ = ±acos(·). Use
  `atan2(±√(1 − c²), c)`: it gives the same angle as acos, and it's the form
  that carries over to every other closed-form IK.
- |cos q₃| = 1 ⇒ the two coincide: stretched or folded, the elbow singularity.

**4. The shoulder angle.** In the plane, the tip direction is atan2(s, r). The
elbow bends the forearm away from the upper arm. In the upper arm's own frame
the tip is at (a₂ + a₃ cos q₃, a₃ sin q₃), so that offset angle is
atan2(a₃ sin q₃, a₂ + a₃ cos q₃). Subtract it:

    q₂ = atan2(s, r) − atan2(a₃ sin q₃, a₂ + a₃ cos q₃)

**5. Count and name the solutions.** front/back × the two elbow signs gives up
to **4** solutions. "Elbow up" means the elbow lies above the shoulder→tip
line. In the vertical plane, measure along the horizontal direction towards the
target (mirror the points if the tip is behind, r < 0): the elbow is up when
cross(tip, elbow) > 0. For the front solutions, elbow up is q₃ < 0. Don't rely
on the sign of q₃ alone, though: for the back solutions it flips.

**6. Wrap and verify.** Report angles in (−π, π] (q and q + 2π are the same
pose; a limit check in lab 14 needs one canonical value). Then **always verify
with FK**. It takes one line, and it catches every sign slip in steps 2–5.

## Task

Implement `wrap_to_pi`, `planar2r_ik`, `elbow_is_up`, `arm3_ik_all`, `arm3_ik`,
`is_reachable`, `fk_position_error`.

    python -m labs.manipulators check lab12
    python -m labs.manipulators visual lab12   # the four solutions for one target

Stretch (no tests): pick a target near the edge of the workspace and watch
the up and down solutions merge as it approaches |cos q₃| = 1.
