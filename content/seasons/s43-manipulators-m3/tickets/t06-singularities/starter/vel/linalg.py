"""Small linear algebra by Gaussian elimination (no numpy): det, rank, solve.

Elimination turns A into an upper-triangular U with row operations:
  - adding a multiple of one row to another changes nothing (not det, not rank);
  - SWAPPING two rows flips the sign of det (partial pivoting swaps in the row with
    the biggest entry, so we never divide by a tiny number).
Then det A = (-1)^swaps * (product of U's diagonal), rank = the number of pivots that
are not (nearly) zero, and A x = b is solved by back substitution.
"""


def _copy(A):
    return [list(map(float, row)) for row in A]


def det(A):
    """The determinant of a square matrix."""
    U = _copy(A)
    n = len(U)
    sign = 1.0
    for k in range(n):
        p = max(range(k, n), key=lambda r: abs(U[r][k]))  # the pivot: biggest entry in column k
        if abs(U[p][k]) < 1e-300:
            return 0.0
        if p != k:
            U[k], U[p] = U[p], U[k]
        for r in range(k + 1, n):
            f = U[r][k] / U[k][k]
            for c in range(k, n):
                U[r][c] -= f * U[k][c]
    product = sign
    for k in range(n):
        product *= U[k][k]
    return product


def rank(A, tol=1e-9):
    """How many independent rows (= columns): pivots bigger than tol * the biggest entry."""
    U = _copy(A)
    rows, cols = len(U), len(U[0])
    scale = max(abs(x) for row in U for x in row) or 1.0
    r = 0
    for c in range(cols):
        if r == rows:
            break
        p = max(range(r, rows), key=lambda i: abs(U[i][c]))
        if abs(U[p][c]) <= tol * scale:
            continue  # no pivot in this column: it depends on the ones before
        U[r], U[p] = U[p], U[r]
        for i in range(r + 1, rows):
            f = U[i][c] / U[r][c]
            for j in range(c, cols):
                U[i][j] -= f * U[r][j]
        r += 1
    return r


def solve(A, b):
    """x with A x = b, for a square, invertible A (raises ValueError if it is singular)."""
    n = len(A)
    M = [list(map(float, A[i])) + [float(b[i])] for i in range(n)]
    for k in range(n):
        p = max(range(k, n), key=lambda r: abs(M[r][k]))
        if abs(M[p][k]) < 1e-14:
            raise ValueError("solve: the matrix is singular (no unique solution)")
        M[k], M[p] = M[p], M[k]
        for r in range(k + 1, n):
            f = M[r][k] / M[k][k]
            for c in range(k, n + 1):
                M[r][c] -= f * M[k][c]
    x = [0.0] * n
    for k in range(n - 1, -1, -1):
        x[k] = (M[k][n] - sum(M[k][c] * x[c] for c in range(k + 1, n))) / M[k][k]
    return x
