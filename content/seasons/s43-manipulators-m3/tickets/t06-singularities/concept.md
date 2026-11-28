**Singularities: when the Jacobian loses rank**

**The direction the arm loses**

At most poses the UR5e can nudge its flange in any of the six directions (three moves, three turns). At a singularity it loses one: some direction needs infinite joint speed, or, put the other way, two joints end up doing the same job. Stretch your own arm straight out: you can't push your hand any further out, whatever your shoulder and elbow do. That's the elbow singularity. The wrist flip is subtler: when joint 5 is at 0, the axes of joints 4 and 6 become parallel, two motors spin the flange about the same line, and one turning direction is gone.

**Rank, then the determinant**

Step 1: rank. The columns of J are the motions each joint can make. If they span all 6 directions, rank J = 6 and v = J q̇ has a solution for every v. At a singularity the columns become dependent: rank < 6, and det J = 0 for a square J.

Step 2: computing them without numpy. Gaussian elimination turns J into an upper-triangular U with row operations. Adding a multiple of one row to another changes nothing; swapping two rows (partial pivoting, to divide by the biggest available entry) flips det's sign:

```text
det J = (-1)^(number of swaps) × U[0][0] × U[1][1] × ... × U[5][5]
rank J = number of pivots that aren't (nearly) zero
```

Step 3: the UR5e's determinant factors (the laptop lab derives it symbolically):

```text
det J = a2 a3 sin(q3) sin(q5) (a2 cos q2 + a3 cos(q2 + q3) + d5 sin(q2 + q3 + q4))
          elbow: sin q3 = 0     wrist: sin q5 = 0     shoulder: the bracket = 0
```

Three factors, three families of singular poses. The elbow: forearm in line with the upper arm. The wrist: q5 = 0 or π, joints 4 and 6 aligned. The shoulder: the wrist centre right above the base axis, so joint 1 can't move it.

Step 4: near is the problem, not at. Exactly singular poses are rare; nearly singular ones are everywhere on a path that crosses them, and there J⁻¹ is huge: tiny gripper moves need wild joint speeds. Ticket 7 measures "how near".

**Elimination, counting swaps**

Elimination with partial pivoting, counting swaps:

```python
def det(A):
    U = [list(map(float, r)) for r in A]
    n, sign = len(U), 1.0
    for k in range(n):
        p = max(range(k, n), key=lambda r: abs(U[r][k]))
        if U[p][k] == 0:
            return 0.0
        if p != k:
            U[k], U[p] = U[p], U[k]
            sign = -sign
        for r in range(k + 1, n):
            f = U[r][k] / U[k][k]
            U[r] = [a - f * b for a, b in zip(U[r], U[k])]
    out = sign
    for k in range(n):
        out *= U[k][k]
    return out

print(det([[0, 1], [1, 0]]), round(det([[1, 2, 3], [4, 5, 6], [7, 8, 10]]), 9))
# Output:
# -1.0 -3.0
```

The swap matrix has det -1: forget the sign flip and you get +1.

**Zero in the right places, wrong sign**

A determinant with the wrong sign still looks plausible, and it is zero in exactly the right places, so a "singular or not" check passes while anything that uses the sign (orientation, which way a solution flips) is silently wrong. And reading the wrong joint into a singularity test is easy: q4 = 0 is a perfectly harmless pose; it is q5 that lines joints 4 and 6 up.

**Three families, on the right joints**

An AI asked for "the UR5e's singularities" will usually list the three families correctly, then attach them to the wrong joints or forget that the home pose is singular (q3 = q5 = 0). Check its claims against det J computed numerically at a pose from each family.
