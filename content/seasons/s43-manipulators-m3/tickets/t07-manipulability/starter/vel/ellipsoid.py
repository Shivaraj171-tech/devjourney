"""Manipulability: how easily the gripper moves in each direction.

Joint speeds of size 1 (|qdot| <= 1) give gripper velocities v = Jv qdot that fill an
ELLIPSOID. Its principal directions are the eigenvectors of Jv Jv^T, and its radii are
the SQUARE ROOTS of the eigenvalues (the eigenvalues of Jv Jv^T are sigma^2, the squared
singular values of Jv). Yoshikawa's manipulability is

    w = sqrt(det(J J^T)) = sigma_1 sigma_2 ... (= |det J| for a square J)

proportional to the ellipsoid's volume: it falls to 0 at a singularity, where the
ellipsoid goes flat.
"""
import math

from rigid.mat import matmul, transpose
from vel.linalg import det


def sym_eig(A, sweeps=30):
    """Eigenvalues and eigenvectors of a symmetric matrix by Jacobi rotations.

    Returns (values, V) with values sorted from biggest to smallest and V's COLUMNS the
    matching unit eigenvectors: A V[:, k] = values[k] V[:, k].
    """
    n = len(A)
    A = [list(map(float, row)) for row in A]
    V = [[float(i == j) for j in range(n)] for i in range(n)]
    for _ in range(sweeps):
        off = sum(A[i][j] ** 2 for i in range(n) for j in range(n) if i != j)
        if off < 1e-22:
            break
        for p in range(n - 1):
            for r in range(p + 1, n):
                if abs(A[p][r]) < 1e-300:
                    continue
                theta = 0.5 * math.atan2(2 * A[p][r], A[r][r] - A[p][p])
                c, s = math.cos(theta), math.sin(theta)
                for k in range(n):  # A <- A G (columns p, r)
                    akp, akr = A[k][p], A[k][r]
                    A[k][p], A[k][r] = c * akp - s * akr, s * akp + c * akr
                for k in range(n):  # A <- G^T A (rows p, r)
                    apk, ark = A[p][k], A[r][k]
                    A[p][k], A[r][k] = c * apk - s * ark, s * apk + c * ark
                for k in range(n):  # V <- V G
                    vkp, vkr = V[k][p], V[k][r]
                    V[k][p], V[k][r] = c * vkp - s * vkr, s * vkp + c * vkr
    order = sorted(range(n), key=lambda k: -A[k][k])
    values = [A[k][k] for k in order]
    vectors = [[V[i][k] for k in order] for i in range(n)]
    return values, vectors


def velocity_ellipsoid(Jv):
    """(radii, axes): the velocity ellipsoid of a 3 x n linear Jacobian.

    radii: 3 numbers, biggest first (sigma_k = sqrt of the eigenvalues of Jv Jv^T).
    axes:  a 3x3 matrix whose COLUMNS are the matching directions.
    """
    values, axes = sym_eig(matmul(Jv, transpose(Jv)))
    radii = [max(0.0, lam) for lam in values]
    return radii, axes


def manipulability(J):
    """Yoshikawa's measure sqrt(det(J J^T))."""
    return det(matmul(J, transpose(J)))
