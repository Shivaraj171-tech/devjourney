**Matrix products and why the order of turns matters**

**Turn your phone twice**

Pick up your phone, screen facing you. Turn it a quarter turn about the vertical axis, then tip it a quarter turn about the left-right axis. Now start again and do the two turns the other way round. The phone ends up in a different pose. In 3D, turns **don't commute**: the order is part of the instruction.

So composing turns needs a tool that keeps track of order. That tool is the matrix product.

**Rows dotted with columns**

A 3x3 rotation R turns a vector v into Rv. Each entry of Rv is a row of R dotted with v:

```text
(Rv)_i = R[i][0]·v[0] + R[i][1]·v[1] + R[i][2]·v[2]
```

Now turn v by A, then turn the result by B. Step 1: u = A v. Step 2: w = B u = B (A v). Step 3: we want one matrix C with w = C v. Write out entry i of B(Av) and regroup the sums:

```text
w_i = Σ_k B[i][k] (Σ_j A[k][j] v_j) = Σ_j (Σ_k B[i][k] A[k][j]) v_j
```

The bracket is the definition of the matrix product C = BA:

```text
C[i][j] = Σ_k B[i][k] · A[k][j]     (row i of B · column j of A)
```

Step 4: read it carefully. In C = BA the turn done **first** (A) sits on the **right**, next to v. "A, then B" is written B A. That is not a convention you can choose: it falls out of w = B(Av).

Why order matters, with numbers. A quarter turn about z sends x → y. A quarter turn about x sends y → z and leaves x alone. So:

```text
"z then x":  x → y → z        (Rx Rz) x = z
"x then z":  x → x → y        (Rz Rx) x = y
```

Different results, so Rx Rz ≠ Rz Rx. In 2D all turns share one axis, so they commute, which is why the flat table never showed the bug.

Shapes: an n×m matrix times an m×p matrix is n×p. The inner sizes must match. The identity I (1s on the diagonal) changes nothing: IA = AI = A.

**A 2x3 times a 3x2, by hand**

The 2x3 times 3x2 product from the first test, with plain loops:

```python
A = [[1, 2, 3], [4, 5, 6]]
B = [[7, 8], [9, 10], [11, 12]]
C = [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(2)] for i in range(2)]
print(C)
# entry (0, 0) by hand: row 0 of A dotted with column 0 of B
print(1 * 7 + 2 * 9 + 3 * 11)
# Output:
# [[58, 64], [139, 154]]
# 58
```

**"Then" runs right to left**

"Then" reads left to right in English, but the matrix for "A then B" is B A. Writing `matmul(first, second)` gives the turns in the opposite order. Careful too: this rule is for turns about the **fixed world** axes. Turns about the box's **own moving** axes compose the other way (A B); you'll meet that in transform chains (ticket 9).

**Two quarter turns you can picture**

Ask the AI's composed rotation where the x axis goes, using two quarter turns you can picture (z then x should send x to z). One hand-checkable case catches a swapped product every time.
