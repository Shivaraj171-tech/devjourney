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
    # TODO: row i of A dotted with column j of B, for every (i, j)
    raise NotImplementedError("matmul is not written yet")


def mat_vec(A, v):
    """A times the vector v."""
    return [sum(A[i][k] * v[k] for k in range(len(v))) for i in range(len(A))]


def then(first, second):
    """The single rotation that does `first`, THEN `second`, both about the fixed world axes.

    """
    return matmul(first, second)
