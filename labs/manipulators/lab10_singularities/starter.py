"""Lab 10: singularities, conditioning and manipulability ellipsoids.

Everything here is a few lines on top of np.linalg.svd. The thinking is in the README.
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox.robots import UR5_DH  # noqa: F401  (a2 = UR5_DH[1,0], ...)


def singular_values(J) -> np.ndarray:
    """Singular values of J, largest first."""
    # TODO: np.linalg.svd(..., compute_uv=False)
    raise NotImplementedError("singular values")


def numerical_rank(J, tol: float = 1e-6) -> int:
    """Number of singular values above tol."""
    # TODO
    raise NotImplementedError("numerical rank")


def is_singular(J, tol: float = 1e-6) -> bool:
    """True when rank < min(rows, cols)."""
    # TODO
    raise NotImplementedError("singularity test")


def condition_number(J) -> float:
    """sigma_max / sigma_min; return float('inf') when sigma_min < 1e-12 * max(sigma_max, 1)."""
    # TODO
    raise NotImplementedError("condition number")


def manipulability(J) -> float:
    """Yoshikawa's measure sqrt(det(J J^T))."""
    # TODO: prefer the product of singular values (why? see README step 4).
    raise NotImplementedError("manipulability")


def velocity_ellipsoid(Jv):
    """Image of {|qdot| <= 1} under Jv. Return (semi-axis lengths (k,), axes (m, k) as columns),
    k = min(m, n), sorted largest first."""
    # TODO: U, s, Vt = svd(Jv)
    raise NotImplementedError("velocity ellipsoid")


def force_ellipsoid(Jv):
    """Forces F producible with |tau| <= 1 where tau = Jv^T F: same axes, lengths 1 / sigma."""
    # TODO
    raise NotImplementedError("force ellipsoid")


def lost_directions(J, tol: float = 1e-6):
    """(task directions you can't move in, joint motions that move nothing), as column matrices:
    the columns of U and of V whose singular value is < tol."""
    # TODO
    raise NotImplementedError("lost directions at a singularity")


def ur5_jacobian_det(q) -> float:
    """Closed-form det of the UR5 geometric Jacobian (README step 6)."""
    # TODO: a2 a3 sin(q3) sin(q5) (a2 cos q2 + a3 cos(q2+q3) + d5 sin(q2+q3+q4))
    raise NotImplementedError("UR5 Jacobian determinant")


def classify_ur5_singularity(q, tol: float = 1e-6) -> set:
    """Subset of {"elbow", "wrist", "shoulder"}: which factor(s) of the determinant vanish."""
    # TODO
    raise NotImplementedError("classify UR5 singularities")
