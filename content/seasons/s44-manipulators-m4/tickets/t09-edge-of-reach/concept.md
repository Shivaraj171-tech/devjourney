**Robust numerical IK: damping, clamping, and the edge of the workspace**

**Three assumptions that fail at the edge**

Textbook Newton assumes three things: a solution exists, the guess is close, and the Jacobian stays invertible on the way. At the edge of the workspace all three fail at once. The target may be a hair out of reach (a box measured 1 cm too far), the arm has to stretch out (the elbow singularity), and each linearisation is valid only for small steps. A production solver is Newton plus guard rails: damping so a nearly-singular J can't demand huge steps, and a clamp so that no single iteration can swing a joint further than the linear model can be trusted.

**Damp, clamp, stop**

Step 1: the error, as in ticket 6: V_b = log(T_sb⁻¹ T_sd), solved against the body Jacobian J_b.

Step 2: the damped step, as in ticket 7:

```text
dq = J_bᵀ (J_b J_bᵀ + λ² I)⁻¹ V_b
```

Near the stretched elbow one singular value of J_b goes to zero; the damped multiplier σ/(σ² + λ²) never exceeds 1/(2λ).

Step 3: the clamp. Even a damped step can be large when the error is large. Scale it down, keeping its direction, so that no joint moves more than MAX_STEP:

```text
m = max_i |dq_i|        if m > MAX_STEP:  dq ← dq · MAX_STEP / m
```

Scaling (not clipping each joint separately) keeps the step pointing where the solver wanted to go.

Step 4: what "success" means now. For a reachable target: the error goes under the tolerance (more iterations than plain Newton, because damping trades speed for safety). For an unreachable one: the error stops changing, at the best compromise the damping allows, and no joint ever jumped. Both are success. Thrashing is the failure.

Step 5: why plain Newton thrashes. Out of reach, Newton aims each step at a point that doesn't exist. Near the singularity its step along the stretched direction is ~1/σ: huge. It overshoots to a sharply bent elbow, the next step overshoots back, and every so often σ is tiny enough for a step of several radians: the log's joint 3 at -9.1 rad.

**Clamping a step that asks too much**

Clamping a damped step that asks for too much:

```python
import math

def clamp_step(dq, max_step):
    biggest = max(abs(x) for x in dq)
    if biggest <= max_step:
        return list(dq)
    return [x * max_step / biggest for x in dq]

dq = [0.0, 4.47, -9.1, 4.63, 0.0, 0.0]
safe = clamp_step(dq, 0.2)
print([round(x, 4) for x in safe], round(max(abs(x) for x in safe), 3))
# Output:
# [0.0, 0.0982, -0.2, 0.1018, 0.0, 0.0] 0.2
```

The step still points the same way (joint 3 back, joints 2 and 4 forward, in the same ratios); it's just short enough to trust.

**Fewest iterations is the wrong goal**

"Fewest iterations" is the wrong metric for a robot. A solver that converges in 6 iterations on easy targets and swings a joint through 520° in one step on hard ones is worse than one that takes 30 and never surprises you. Test the edge on purpose: a target exactly at reach, one a little beyond, one near a wrist flip. And clamp the step, not the joints: clipping each joint to a range changes the step's direction.

**Simplified IK, tested at the edge**

Ask an AI to "speed up my IK" and it will often remove damping and limits first. Before accepting any IK simplification, run it on a target 1 cm out of reach and check the biggest joint step and whether the error settles.
