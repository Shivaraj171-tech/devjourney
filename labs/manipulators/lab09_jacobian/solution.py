"""Lab 09 reference solution: space, body and geometric Jacobians + finite-difference checks.

Twists are (omega, v). The *geometric* Jacobian returned here is stacked [v; omega] with v the
linear velocity of the end-effector point in world axes: the same thing MuJoCo's
mj_jacSite returns as (jacp, jacr).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import skew
from labs.manipulators.lab05_transforms.solution import transform_inverse
from labs.manipulators.lab07_poe.solution import adjoint, exp_se3, fk_space, matrix_to_twist


def jacobian_space(Slist, q) -> np.ndarray:
    """J_s(q): column i = Ad_{e^[S1]q1 ... e^[S_{i-1}]q_{i-1}} S_i."""
    Slist = np.asarray(Slist, dtype=float)
    J = np.zeros_like(Slist)
    T = np.eye(4)
    for i in range(Slist.shape[1]):
        J[:, i] = adjoint(T) @ Slist[:, i]
        T = T @ exp_se3(Slist[:, i], q[i])
    return J


def jacobian_body(Blist, q) -> np.ndarray:
    """J_b(q): column i = Ad_{e^-[B_n]q_n ... e^-[B_{i+1}]q_{i+1}} B_i."""
    Blist = np.asarray(Blist, dtype=float)
    n = Blist.shape[1]
    J = np.zeros_like(Blist)
    T = np.eye(4)
    for i in range(n - 1, -1, -1):
        J[:, i] = adjoint(T) @ Blist[:, i]
        T = T @ exp_se3(Blist[:, i], -q[i])
    return J


def space_to_body_jacobian(T_sb, J_s) -> np.ndarray:
    """J_b = Ad_{T_sb^-1} J_s."""
    return adjoint(transform_inverse(T_sb)) @ J_s


def numerical_jacobian_space(fk, q, h: float = 1e-6) -> np.ndarray:
    """Central differences: column i = vee( dT/dq_i @ T^-1 ), the spatial twist per unit q_i."""
    q = np.asarray(q, dtype=float)
    T_inv = transform_inverse(fk(q))
    cols = []
    for i in range(len(q)):
        e = np.zeros_like(q)
        e[i] = h
        dT = (fk(q + e) - fk(q - e)) / (2 * h)
        cols.append(matrix_to_twist(dT @ T_inv))
    return np.column_stack(cols)


def numerical_jacobian_body(fk, q, h: float = 1e-6) -> np.ndarray:
    """Column i = vee( T^-1 @ dT/dq_i ), the body twist per unit q_i."""
    q = np.asarray(q, dtype=float)
    T_inv = transform_inverse(fk(q))
    cols = []
    for i in range(len(q)):
        e = np.zeros_like(q)
        e[i] = h
        cols.append(matrix_to_twist(T_inv @ (fk(q + e) - fk(q - e)) / (2 * h)))
    return np.column_stack(cols)


def geometric_jacobian(M, Slist, q) -> np.ndarray:
    """6 x n [Jv; Jw]: end-effector point velocity and angular velocity, world axes.

    From a spatial twist (w, v_s): the velocity of the point p is v_s + w x p = v_s - [p] w.
    """
    Js = jacobian_space(Slist, q)
    p = fk_space(M, Slist, q)[:3, 3]
    Jw = Js[:3]
    Jv = Js[3:] - skew(p) @ Jw
    return np.vstack([Jv, Jw])


def numerical_position_jacobian(position_fn, q, h: float = 1e-6) -> np.ndarray:
    """3 x n d p / d q by central differences."""
    q = np.asarray(q, dtype=float)
    cols = []
    for i in range(len(q)):
        e = np.zeros_like(q)
        e[i] = h
        cols.append((position_fn(q + e) - position_fn(q - e)) / (2 * h))
    return np.column_stack(cols)
