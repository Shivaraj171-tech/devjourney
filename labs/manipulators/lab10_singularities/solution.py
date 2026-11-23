"""Lab 10 reference solution: singularities, conditioning and manipulability ellipsoids."""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox.robots import UR5E_DH


def singular_values(J) -> np.ndarray:
    return np.linalg.svd(np.asarray(J, dtype=float), compute_uv=False)


def numerical_rank(J, tol: float = 1e-6) -> int:
    """Number of singular values above tol."""
    return int(np.sum(singular_values(J) > tol))


def is_singular(J, tol: float = 1e-6) -> bool:
    """True when J has lost rank (rank < min(rows, cols))."""
    J = np.asarray(J)
    return numerical_rank(J, tol) < min(J.shape)


def condition_number(J) -> float:
    """sigma_max / sigma_min (inf at an exact singularity)."""
    s = singular_values(J)
    return float("inf") if s[-1] < 1e-12 * max(s[0], 1.0) else float(s[0] / s[-1])


def manipulability(J) -> float:
    """Yoshikawa's measure sqrt(det(J J^T)) = product of singular values."""
    return float(np.prod(singular_values(J)))


def velocity_ellipsoid(Jv):
    """Image of the unit ball |qdot| <= 1 under Jv: (semi-axis lengths, axes as columns)."""
    U, s, _ = np.linalg.svd(np.asarray(Jv, dtype=float))
    k = len(s)
    return s, U[:, :k]


def force_ellipsoid(Jv):
    """Forces reachable with |tau| <= 1 (tau = Jv^T F): same axes, lengths 1/sigma."""
    s, U = velocity_ellipsoid(Jv)
    with np.errstate(divide="ignore"):
        return 1.0 / s, U


def lost_directions(J, tol: float = 1e-6):
    """At (near) singularity: (task directions you can't move in, joint motions that do nothing).

    Columns of U (left singular vectors) and V (right singular vectors) whose singular value < tol.
    """
    U, s, Vt = np.linalg.svd(np.asarray(J, dtype=float))
    small = np.where(s < tol)[0]
    return U[:, small], Vt[small].T


def ur5e_jacobian_det(q) -> float:
    """Closed-form det of the UR5e geometric Jacobian:
    a2 a3 sin(q3) sin(q5) (a2 cos q2 + a3 cos(q2+q3) + d5 sin(q2+q3+q4))."""
    a2, a3, d5 = UR5E_DH[1, 0], UR5E_DH[2, 0], UR5E_DH[4, 2]
    _, q2, q3, q4, q5, _ = q
    return float(a2 * a3 * np.sin(q3) * np.sin(q5)
                 * (a2 * np.cos(q2) + a3 * np.cos(q2 + q3) + d5 * np.sin(q2 + q3 + q4)))


def classify_ur5e_singularity(q, tol: float = 1e-6) -> set:
    """Which factors of the determinant vanish: subset of {"elbow", "wrist", "shoulder"}."""
    a2, a3, d5 = UR5E_DH[1, 0], UR5E_DH[2, 0], UR5E_DH[4, 2]
    _, q2, q3, q4, q5, _ = q
    kinds = set()
    if abs(np.sin(q3)) < tol:
        kinds.add("elbow")
    if abs(np.sin(q5)) < tol:
        kinds.add("wrist")
    if abs(a2 * np.cos(q2) + a3 * np.cos(q2 + q3) + d5 * np.sin(q2 + q3 + q4)) < tol:
        kinds.add("shoulder")
    return kinds
