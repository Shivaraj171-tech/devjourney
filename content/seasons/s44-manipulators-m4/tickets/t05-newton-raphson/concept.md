**Numerical IK: Newton-Raphson on the position error**

**Reaching blindfolded**

You're blindfolded, reaching for a cup, and someone tells you "3 cm left, 1 cm up". You know your arm: moving the shoulder a bit shifts the hand this way, the elbow that way. So you pick the joint motion that should cover those 3 cm and 1 cm, do it, and ask again. You won't land exactly (your arm isn't linear), but the second miss is much smaller than the first, and the third is tiny. That's Newton-Raphson: linearise with the Jacobian, solve the linear problem exactly, repeat.

**Error, Jacobian, step, repeat**

Step 1: the error. With target p* and the current guess q:

```text
e = p* - p(q)          (where we want to be, minus where we are)
```

Step 2: linearise. For a small joint step dq, forward kinematics changes by about J(q) dq (Module 3). We want that change to be e:

```text
J(q) dq = e      =>     dq = J(q)⁻¹ e        (solve, don't invert)
```

Step 3: iterate. q ← q + dq, recompute e, stop when |e| is under a tolerance (or after a fixed number of steps: never loop forever on a robot).

Step 4: why it's fast. The linearisation's error is quadratic in the step: |e_new| ≈ C |e_old|². Near a solution, the number of correct digits roughly doubles each step: 1e-2, 1e-4, 1e-8, 1e-16. Five or six steps from a decent guess.

Step 5: its weaknesses. It finds the solution NEAREST to the guess in a loose sense (start near elbow down, get elbow down); from a bad guess it can wander; and near a singularity J⁻¹ blows up (ticket 7). It needs a square, invertible J: for more joints than error components you need a pseudo-inverse or damped least squares.

Step 6: the sign. Everything hinges on e pointing FROM where we are TO where we want to be. Flip it and every step goes the wrong way: the iteration runs away from the target, or orbits around it.

**Two-link Newton to (0.6, 0.2)**

Newton on the two-link arm, from (0.3, 1.2) to the box (0.6, 0.2), with the 2x2 Jacobian solved by Cramer's rule:

```python
import math

def fk(q):
    return (0.5 * math.cos(q[0]) + 0.4 * math.cos(q[0] + q[1]), 0.5 * math.sin(q[0]) + 0.4 * math.sin(q[0] + q[1]))

def jac(q):
    s1, c1, s12, c12 = math.sin(q[0]), math.cos(q[0]), math.sin(q[0] + q[1]), math.cos(q[0] + q[1])
    return [[-0.5 * s1 - 0.4 * s12, -0.4 * s12], [0.5 * c1 + 0.4 * c12, 0.4 * c12]]

q, target = [0.3, 1.2], (0.6, 0.2)
for _ in range(5):
    e = [t - p for t, p in zip(target, fk(q))]
    print(f"{math.hypot(*e):.0e}", end=" ")
    J = jac(q)
    d = J[0][0] * J[1][1] - J[0][1] * J[1][0]
    q = [q[0] + (J[1][1] * e[0] - J[0][1] * e[1]) / d, q[1] + (-J[1][0] * e[0] + J[0][0] * e[1]) / d]
# Output:
# 4e-01 1e-01 2e-02 4e-04 2e-07
```

Each error is roughly the square of the one before (times a constant): quadratic convergence. One more step would give about 1e-13.

**A sign error that never crashes**

A sign error in e doesn't crash anything: the code runs, the arm moves, the error just never falls. Plot the error per iteration (a log scale shows convergence as a straight drop that steepens); if the very first step makes it bigger, suspect the sign before anything clever.

**Current minus target, or the other way?**

AI-written Newton loops often compute "error = current - target" (a natural way to say "error") and then add the step. Check the convention on one iteration by hand: does the first step reduce |e|?
