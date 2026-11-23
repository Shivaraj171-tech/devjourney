# Lab 27 · Grasp quality: force closure and the epsilon metric

Module 8 (grasping) · 200 XP · browser twin: Module 8 of the web track (planned) ·
numpy only

## Intuition

Lab 26 asked whether a grasp can resist **one** known load: gravity. But a robot
carrying a box gets shaken, accelerated, bumped. A good grasp resists **any** small
disturbance, from any direction, pushing or twisting. That property has a name:
**force closure**. The contacts, each pushing only within its friction cone, can
together produce *every* wrench, so whatever the world does to the object, some
admissible finger forces cancel it.

How *well* a grasp does that is a number. Draw all the wrenches the contacts can
produce with unit effort; they fill a convex shape in 6-D wrench space. If the origin is
strictly inside it, the grasp is force closure, and **the radius of the largest ball
around the origin that fits inside** (the ε-metric of Ferrari & Canny, 1992) says how
large a disturbance, in the worst direction, unit finger forces can still balance. A
simpler cousin, the **smallest singular value of the grasp matrix**, ignores that
contacts can't pull. We'll see exactly when that's misleading.

## Key maths, step by step

**1. Make the units comparable.** A wrench mixes moments (N m) and forces (N). A
"ball" in wrench space only makes sense if both are in the same units, so divide moments
by a characteristic length L (here the box's half size, a = 2 cm): w = (m/L, f). Lab 26's
grasp matrix becomes G_L with its three moment rows divided by L.

**2. The grasp matrix's weakest direction.** w = G_L f. Its singular value
decomposition says: the unit-norm stacked force f that's least effective produces a
wrench of size **σ_min(G_L)**. If σ_min = 0, some wrench direction can't be produced *at
all*. Two point contacts on opposite faces can't twist the box about the line through
them (every contact force passes through that line), so G_L has rank 5 and σ_min = 0. But
σ_min treats forces as two-way: three fingers pressing on the *top* face give a
full-rank G (σ_min = 0.28) even though nothing stops the box being pulled down and away.

**3. Primitive wrenches.** Respect the cones: each contact's force is a positive
combination of its k cone edges (lab 26) with unit normal force, so every admissible
grasp wrench is a positive combination of the **primitive wrenches**
wᵢⱼ = ((pᵢ × f_ij)/L, f_ij). A *soft finger* (a pad, not a point) can also twist about its
normal up to γ N m per newton of normal force (MuJoCo's `condim="4"` torsional friction).
Model it by doubling each edge with an extra pure moment ±γ n.

**4. Force closure and ε.** The wrenches available with total normal force ≤ 1 form the
convex hull of the primitive wrenches. Its *support function*

    h(u) = maxᵢ u · wᵢ           (‖u‖ = 1)

is how far the hull reaches in direction u. The largest ball centred at the origin inside
the hull has radius

    ε = min over unit u of h(u)

If ε > 0 the grasp is force closure. If ε < 0 the origin is outside the hull, and −ε is
its distance to it: some direction can't be resisted at all. ε = 0 means the origin is on
the boundary (e.g. a two-point pinch, which can hold its load but can't resist a twist about
the finger axis).

**5. Computing ε without a hull library.** The textbook way builds the 6-D convex hull
(qhull) and takes the nearest facet. We don't pin scipy, so we minimise h(u) directly:

- **Sample** the ±axes plus 2000 random directions and keep min h. Every sample is an
  *upper bound*, since the true minimum may lie between samples, and in 6-D it's rough:
  13–20% high for the cross-polytope, and **2× too high** for the tripod grasp.
- **Refine** the 10 best samples. h is a max of linear functions, with a kink wherever the
  maximising wᵢ changes, so descend on its smooth soft-max version
  h_β(u) = (1/β) log Σ exp(β u·wᵢ). Its gradient is the softmax-weighted average
  of the wᵢ. Project the gradient onto the sphere's tangent (g − (g·u)u), step u ← u − g/β,
  renormalise, and raise β from 20 to 10⁶ over 1000 steps so h_β → h.

We checked this against an exhaustive search: every facet of a 6-D hull passes through 6
of the points, so for k = 4 edges (16 wrenches, 8008 subsets) the test enumerates all
hyperplanes and keeps the supporting ones. Refined ε matches to 10⁻⁶ (0.223607 for the
four-finger grasp, 0.141855 for the tripod at μ = 0.5). The cross-polytope (±eᵢ) gives
1/√6 exactly.

**6. Antipodal grasps.** Two fingers can squeeze an object only if the line between the
contacts lies inside *both* cones: μ ≥ tan(angle between that line and each normal).
Offsetting the fingers by a/2 up and down tilts the line by atan(½), so the pinch needs
μ ≥ 0.5. Below that, ε < 0 (the fingers squirt the box out). Above it, ε = 0, like the
centred pinch.

**7. Compare.** `rank_grasps` sorts candidates by ε and reports σ_min alongside.

## What we measured

Cube with a = 2 cm, L = a, k = 8 cone edges:

| grasp | ε (μ = 0.3) | ε (μ = 0.5) | ε (μ = 1) | σ_min(G_L) | force closure (μ = 0.5)? |
|---|---|---|---|---|---|
| four fingers, two per side | 0.148 | 0.245 | 0.491 | 1.00 | yes |
| tripod (1 + 2 fingers) | 0.089 | 0.147 | 0.284 | 0.85 | yes |
| two-finger pinch | 0 | 0 | 0 | 0 | no (boundary) |
| pinch, fingers offset ±a/2 | −0.20 | 0 | 0 | 0 | no; needs μ ≥ 0.5 to squeeze at all |
| two adjacent faces | −0.49 | −0.35 | 0 | 0 | no |
| three fingers on top | −1 | −1 | −1 | 0.28 | no, yet σ_min > 0 |

With soft fingers (γ = 5 mm, μ = 0.5) the two-finger pinch becomes force closure with
ε = 0.25. That's why lab 28's pads use `condim="4"`. ε grows about linearly with μ (four
fingers: 0.05, 0.10, 0.15, 0.24, 0.39, 0.49 for μ = 0.1 … 1).

## Task

Implement `scaled_grasp_matrix`, `min_singular_value`, `primitive_wrenches`, `support`,
`epsilon_sampled`, `refine_direction`, `epsilon_metric`, `is_force_closure`,
`antipodal_min_friction`, `rank_grasps`.

    python -m labs.manipulators check lab27
    python -m labs.manipulators visual lab27   # epsilon and sigma_min per candidate grasp
