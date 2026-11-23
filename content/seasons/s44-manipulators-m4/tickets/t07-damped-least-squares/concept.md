**Damped least squares: Newton that can't explode**

**Intuition**

Near a singularity the arm can barely move in one direction (the ellipsoid is flat there). Plain Newton doesn't care: if the error points that way, it demands whatever joint step it takes, and 1/σ for a tiny σ is enormous. Damped least squares changes the question from "which step makes J dq exactly e?" to "which step gets J dq close to e without being huge?". It's a negotiation: in directions the arm moves easily, it behaves like Newton; in the nearly-impossible direction, it gives up a little accuracy for a lot of sanity.

**The maths**

Step 1: the compromise as a cost. Penalise both the miss and the step size, weighted by λ (the damping, in the same units as J's singular values):

```text
minimise  |J dq - e|² + λ² |dq|²
```

Step 2: set the gradient to zero: Jᵀ (J dq - e) + λ² dq = 0, so (JᵀJ + λ² I) dq = Jᵀ e. An equivalent, smaller system (size of e, not of dq):

```text
dq = Jᵀ (J Jᵀ + λ² I)⁻¹ e
```

J Jᵀ + λ² I is always invertible for λ > 0, even exactly at a singularity.

Step 3: what it does to each direction. In terms of J's singular values σ, plain Newton scales each component of e by 1/σ; DLS by

```text
σ / (σ² + λ²)       ≈ 1/σ when σ >> λ  (Newton)      ≈ σ/λ² → 0 when σ << λ  (a tiny step)
```

The biggest possible step multiplier is 1/(2λ), at σ = λ: the explosion is capped.

Step 4: choosing λ. Too small: little protection. Too large: slow convergence everywhere (every step is shortened). Values like 0.01-0.1 for an arm of about a metre are common; adaptive schemes (Levenberg-Marquardt) shrink λ when steps work and grow it when they don't.

Step 5: out of reach. No exact solution exists; DLS converges to a pose that balances the remaining error against the damping: stretched out, pointing at the box, a little short of the best possible miss. Plain Newton keeps trying to do the impossible and oscillates.

**Worked example**

A Jacobian with one easy direction (σ = 1) and one nearly singular (σ = 0.01), the same error along both:

```python
J = [[1.0, 0.0], [0.0, 0.01]]
e = [1.0, 1.0]
newton = [e[0] / J[0][0], e[1] / J[1][1]]
lam = 0.1
dls = [J[i][i] * e[i] / (J[i][i] ** 2 + lam ** 2) for i in range(2)]
print([round(x, 3) for x in newton], [round(x, 3) for x in dls])
# Output:
# [1.0, 100.0] [0.99, 0.99]
```

Newton asks joint 2 for 100 rad to fix 1 cm. DLS barely changes the easy direction and refuses the impossible one.

**Watch out**

"Damping" must go in the right place: Jᵀ (J Jᵀ + λ² I)⁻¹, with λ SQUARED on the diagonal of J Jᵀ. Adding λ to J itself, (J + λ I)⁻¹ e, is a different (and for most J meaningless) matrix: it shifts the singular values, changes the direction of the step, and doesn't even work for a non-square J.

**AI check**

AI code often writes "damped" pseudo-inverses with the λ in the wrong spot or unsquared. Check it on a diagonal J by hand (like the example): the damped multiplier must be σ / (σ² + λ²).
