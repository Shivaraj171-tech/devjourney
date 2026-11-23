# Lab 26 · Grasp basics: contacts, friction cones, holding a box

Module 8 (grasping) · 180 XP · browser twin: Module 8 of the web track (planned) ·
MuJoCo part runs if `mujoco` is installed

## Intuition

Everything so far was about the arm. Now the arm has to *hold* something, and holding is
a negotiation between surfaces. A fingertip can only **push** on an object, never pull,
and it can only push *sideways* as much as friction allows. Coulomb's law draws that
limit as a cone around the contact normal: any force inside the cone is available, and
anything outside makes the surfaces slide.

So a grasp is a set of contact points, each with its cone, and the question "does it
hold?" becomes: can forces chosen inside those cones add up to exactly cancel the load
(here, gravity)? For two flat fingers squeezing a box, the answer is a one-line formula.
We derive it, then let MuJoCo drop (or not drop) a box right at the threshold.

## Key maths, step by step

**1. A contact frame.** At a contact with unit normal n (pointing *into* the object), pick
two unit tangents t₁, t₂ ⟂ n with t₁ × t₂ = n. Any helper vector not parallel to n works:
t₁ = normalise(h × n), t₂ = n × t₁.

**2. Coulomb's cone.** Split a contact force into normal and tangential parts,
f_n = f·n and f_t = f − f_n n. The contact holds (sticks) only if

    f_n ≥ 0      and      ‖f_t‖ ≤ μ f_n

which is a circular cone of half-angle atan μ around n. For computations we often
replace it by k edges, f_j = n + μ(cos a_j t₁ + sin a_j t₂) with a_j = 2πj/k, whose positive
combinations fill an inscribed pyramid (MuJoCo's `cone="pyramidal"` is the same idea; our
rig uses `cone="elliptic"`, the exact circle).

**3. From contact forces to the object's wrench.** A force f at point p (object frame)
produces the wrench (m, f) = (p × f, f), moment first, the same order as twists (ω, v).
Stack all contact forces into one vector and the total wrench is linear in them:

    w = G [f₁; …; f_k],      G = [ [p₁]ₓ  …  [p_k]ₓ ]      (6 × 3k, the grasp matrix)
                                 [  I    …    I   ]

The load is also a wrench: the weight is (0, 0, −mg) at the COM, i.e.
w_g = (c × (0, 0, −mg), (0, 0, −mg)). **Equilibrium:** G f + w_g = 0, with every fᵢ in its
cone.

**4. The two-finger pinch, derived.** A box of mass m, fingers on its −x and +x faces at
the same height, each pressing with normal force N. By symmetry each finger carries half
the weight through friction:

    f_left = (N, 0, mg/2),     f_right = (−N, 0, mg/2)

The x parts cancel, the z parts carry mg, and the moments cancel because the
points are opposite each other. For each force to lie in its cone, ‖f_t‖ = mg/2 ≤ μN, so

    μ ≥ μ_min = m g / (2 N)

Squeeze twice as hard and you need half the friction. That's why grippers with slippery
pads squeeze hard. For our box, m = 0.2 kg and N = 5 N give μ_min = 0.1962.

**5. Reading contact forces from MuJoCo.** Checked in MuJoCo 4.0.1 (see also lab 25):
`data.contact[i]` has `geom1`, `geom2`, `pos` (a point between the surfaces) and `frame`
(a 3×3 stored row-wise whose **first row is the normal, pointing from geom1 to geom2**).
`mujoco.mj_contactForce(model, data, i, out6)` writes the force in that frame, normal
first, and it is the force **on geom2**. So the world force on geom2 is `frame.T @ out[:3]`
(frame rows are the axes), and the force on geom1 is its negative. `model.geom_bodyid` tells
you which body owns a geom.

**6. The experiment.** `toolbox.models.pinch_mjcf(mu, box_mass)`: two fingers on slide
joints, each driven by a `<motor>` (so `data.ctrl[:] = N` *is* the squeeze force),
squeezing a free 4 cm cube with nothing under it. Friction on the pads is μ and on the box
is 0, and MuJoCo uses the larger of a pair's friction coefficients. Let it settle for 0.1 s,
then measure how far the box sinks in 1 s.

**Soft contacts creep.** MuJoCo's contacts are slightly soft (that's what makes them
stable and fast to solve), so even inside the cone a loaded contact slides very slowly. With
default settings we measured 2.6 mm/s at any μ above the threshold. The rig sets
`impratio="10"`, which makes friction ten times stiffer than the normal direction
(MuJoCo's documented use of that option). That reduced the creep to 0.26 mm/s and left
the threshold where it was.

## What we measured

m = 0.2 kg, N = 5 N per finger, μ_min = 0.1962 (elliptic cones, impratio 10, 1 ms):

| μ / μ_min | after 1 s |
|---|---|
| 0.5, 0.9, 0.97 | dropped out of the fingers (no contacts left) |
| 1.03, 1.1, 1.5, 3 | held: sank 0.26 mm (the creep above) |

For a held box the contact forces add up to (0, 0, 1.962) N, its weight, and each contact's
|f_t|/f_n is exactly 0.1962 = μ_min (four contacts per pad face, each carrying a
quarter). For a box *sliding* at μ = 0.157 (50 ms into the fall) every contact has
|f_t|/f_n = 0.157 = μ: a sliding contact sits on the cone's boundary, as Coulomb says. The
threshold is sharp to within ±3% in our runs. That sharpness is a property of this clean
symmetric setup; lab 28's moving gripper needs a margin.

## Task

Implement `contact_frame`, `in_friction_cone`, `friction_cone_edges`, `contact_wrench`,
`grasp_matrix`, `gravity_wrench`, `min_friction_two_finger`, `two_finger_forces`,
`box_contact_forces`, `pinch_experiment`.

    python -m labs.manipulators check lab26
    python -m labs.manipulators visual lab26   # box drop vs mu / mu_min (needs MuJoCo)
