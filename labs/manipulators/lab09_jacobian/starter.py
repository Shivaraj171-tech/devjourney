"""Lab 09: space, body and geometric Jacobians, checked by finite differences and by MuJoCo.

Twists are (omega, v). The *geometric* Jacobian is stacked [v; omega] where v is the linear
velocity of the end-effector POINT in world axes (MuJoCo's mj_jacSite gives the same: jacp, jacr).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import (  # noqa: F401  (reference lab01/05/07 helpers)
    adjoint, exp_se3, fk_space, matrix_to_twist, skew, transform_inverse,
)


def jacobian_space(Slist, q) -> np.ndarray:
    """6 x n space Jacobian: column i = Ad_{e^[S1]q1 ... e^[S_{i-1}]q_{i-1}} S_i."""
    # TODO: keep a running product T; column i uses T *before* multiplying in joint i.
    raise NotImplementedError("space Jacobian")


def jacobian_body(Blist, q) -> np.ndarray:
    """6 x n body Jacobian: column i = Ad_{e^-[B_n]q_n ... e^-[B_{i+1}]q_{i+1}} B_i."""
    # TODO: same idea, but walk from the last joint backwards with NEGATIVE angles.
    raise NotImplementedError("body Jacobian")


def space_to_body_jacobian(T_sb, J_s) -> np.ndarray:
    """J_b = Ad_{T_sb^-1} J_s."""
    # TODO
    raise NotImplementedError("change the Jacobian's frame")


def numerical_jacobian_space(fk, q, h: float = 1e-6) -> np.ndarray:
    """Finite-difference space Jacobian. fk(q) returns a 4x4 pose.

    Column i = matrix_to_twist( dT/dq_i @ T^-1 ) with a CENTRAL difference for dT/dq_i.
    """
    # TODO
    raise NotImplementedError("numerical space Jacobian")


def numerical_jacobian_body(fk, q, h: float = 1e-6) -> np.ndarray:
    """Finite-difference body Jacobian: column i = matrix_to_twist( T^-1 @ dT/dq_i )."""
    # TODO
    raise NotImplementedError("numerical body Jacobian")


def geometric_jacobian(M, Slist, q) -> np.ndarray:
    """6 x n [Jv; Jw] at the end-effector point, world axes (README step 5)."""
    # TODO: from J_s and p = fk_space(...)[:3, 3]: Jw = top half, Jv = bottom half - [p] Jw.
    raise NotImplementedError("geometric Jacobian")


def numerical_position_jacobian(position_fn, q, h: float = 1e-6) -> np.ndarray:
    """3 x n dp/dq by central differences; position_fn(q) returns a 3-vector."""
    # TODO
    raise NotImplementedError("numerical position Jacobian")
