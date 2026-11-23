"""mat: a tiny matrix helper (no numpy in the browser), for 3x3 and 4x4 matrices.

A matrix is a list of rows: A[i][j] is row i, column j. A vector is a plain list.
"""


def identity(n):
    """The n x n identity matrix."""
    return [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]


def transpose(A):
    """Rows become columns: transpose(A)[i][j] == A[j][i]."""
    return [[A[j][i] for j in range(len(A))] for i in range(len(A[0]))]


def matmul(A, B):
    """The matrix product A B: entry (i, j) is row i of A dotted with column j of B."""
    if len(A[0]) != len(B):
        raise ValueError(f"can't multiply a {len(A)}x{len(A[0])} by a {len(B)}x{len(B[0])} matrix")
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))]
            for i in range(len(A))]


def mat_vec(A, v):
    """A times the vector v."""
    return [sum(A[i][k] * v[k] for k in range(len(v))) for i in range(len(A))]


def then(first, second):
    """The single rotation that does `first`, THEN `second`, both about the fixed world axes.

    The rotation applied first sits on the RIGHT: (second first) v = second (first v).
    """
    return matmul(second, first)
